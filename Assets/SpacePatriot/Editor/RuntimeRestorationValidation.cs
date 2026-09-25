using System;
using System.IO;
using System.Reflection;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEditor;
using SpacePatriot;
public static class RuntimeRestorationValidation
{
    public static void Run()
    {
        using var inputScope = new ValidationInputScope();
        var game=FrontierGame.Instance;if(game==null||!Application.isPlaying)throw new Exception("Run in Play mode.");
        var flags=BindingFlags.Instance|BindingFlags.NonPublic|BindingFlags.Public;var type=typeof(FrontierGame);var lines=new List<string>();
        void Set(string field,object value)=>type.GetField(field,flags).SetValue(game,value);
        object Call(string method,params object[] args)=>type.GetMethod(method,flags).Invoke(game,args);
        void Check(bool value,string name){if(!value)throw new Exception("RUNTIME CHECK FAILED: "+name);lines.Add("PASS "+name);}
        const string key="SpacePatriot.Unity.Frontier.v1";bool had=PlayerPrefs.HasKey(key);string stored=PlayerPrefs.GetString(key);
        var oldMouse=Mouse.current;var mouse=InputSystem.AddDevice<Mouse>();
        var original=game.save;var oldKeyboard=Keyboard.current;var keyboard=InputSystem.AddDevice<Keyboard>();var oldPad=Gamepad.current;var pad=InputSystem.AddDevice<Gamepad>();
        try{
            game.save=JsonUtility.FromJson<SaveData>(JsonUtility.ToJson(original));game.save.ship=0;game.save.fuel=100;game.save.hull=100;
            Call("RespawnShip");game.started=true;game.menu=false;game.walking=false;game.cockpit=true;game.flying=true;game.gearDown=false;game.powered=true;game.throttle=1;
            game.ship.position=new Vector3(0,game.world.Deck+120,0);Set("focused",true);Set("inputNeutral",false);
            Vector3 Velocity()=>(Vector3)type.GetField("velocity",flags).GetValue(game);
            void Frame(params Key[] keys){InputSystem.QueueStateEvent(mouse,new MouseState());InputSystem.QueueStateEvent(keyboard,new KeyboardState(keys));InputSystem.Update();Call("Flight",.02f);}
            Frame(Key.A);Check(Velocity().x<0&&Mathf.Abs(Velocity().z)<.01f,"Actual A key creates lateral flight thrust");
            Set("velocity",Vector3.zero);Frame(Key.S);Check(Velocity().z<0,"Actual S key reverses");
            Set("velocity",Vector3.zero);Frame(Key.Space);Check(Velocity().y>0,"Actual Space key creates upward flight thrust");
            Set("velocity",Vector3.zero);Frame(Key.LeftCtrl);Check(Velocity().y<0,"Actual Ctrl key descends without firing");
            game.flightAssist=false;Set("velocity",new Vector3(20,0,0));Frame(Key.W);Check(Mathf.Abs(Velocity().x-20)<.01f&&Velocity().z>0,"Actual decoupled flight preserves lateral motion while accelerating forward");
            float before=Velocity().magnitude;Frame(Key.X);Check(Velocity().magnitude<before,"Actual X key brakes the ship");
            Frame();game.flightAssist=true;Set("inputNeutral",false);Set("focused",true);Set("velocity",Vector3.zero);InputSystem.QueueStateEvent(pad,new GamepadState{leftStick=Vector2.right});InputSystem.Update();Call("Flight",.02f);
            Check(Velocity().x>0,"Gamepad left stick supplies strafe through actual flight controller: velocity="+Velocity()+" stick="+pad.leftStick.ReadValue()+" current="+(Gamepad.current==pad)+" neutral="+type.GetField("inputNeutral",flags).GetValue(game)+" instruments="+game.instruments+" flying="+game.flying+" focused="+type.GetField("focused",flags).GetValue(game));
            Set("velocity",Vector3.zero);InputSystem.QueueStateEvent(pad,new GamepadState().WithButton(GamepadButton.RightShoulder));InputSystem.Update();Call("Flight",.02f);
            Check(Velocity().y>0,"Gamepad shoulder supplies upward thrust");InputSystem.QueueStateEvent(pad,new GamepadState());InputSystem.Update();
            game.armed=false;game.heat=0;Set("shipWeapon",0);int rounds=game.save.ammo[0].mag;Call("Fire");Check(game.save.ammo[0].mag==rounds,"Safe weapon cannot expend ammunition");
            InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.Y));InputSystem.Update();Call("UpdateWeapons",.02f);Check(game.armed,"Actual Y key arms weapons");
            Call("Fire");Check(game.save.ammo[0].mag==rounds-1,"Kinetic firing expends one round");
            game.save.ammo[0].mag=0;game.save.ammo[0].reserve=25;InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.R));InputSystem.Update();Call("UpdateWeapons",.02f);
            Check(game.save.ammo[0].mag==0,"Reload does not grant ammunition immediately");InputSystem.QueueStateEvent(keyboard,new KeyboardState());InputSystem.Update();Call("UpdateWeapons",3f);
            Check(game.save.ammo[0].mag==25&&game.save.ammo[0].reserve==0,"Reload transfers only the available reserve after its duration");
            InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.Digit2));InputSystem.Update();Call("UpdateWeapons",.02f);float charge=(float)type.GetField("capacitor",flags).GetValue(game);Call("Fire");
            Check(game.Weapon.id=="laser"&&(float)type.GetField("capacitor",flags).GetValue(game)<charge,"Actual 2 key selects pulse laser and firing drains capacitor");
            InputSystem.QueueStateEvent(keyboard,new KeyboardState(Key.Digit3));InputSystem.Update();Call("UpdateWeapons",.02f);int missiles=game.save.ammo[2].mag;Set("lockProgress",0f);Call("Fire");
            Check(game.Weapon.id=="missile"&&game.save.ammo[2].mag==missiles,"Missile launch requires seeker lock");InputSystem.QueueStateEvent(keyboard,new KeyboardState());InputSystem.Update();
            game.flightAssist=true;game.flying=false;game.ship.position=new Vector3(0,game.world.Deck+game.StandHeight,0);Set("velocity",Vector3.zero);game.cargoDoor=true;Call("Launch");Check(!game.flying,"Open cargo hatch blocks launch");
            game.save.organics=0;game.save.ore=0;game.save.crystal=0;CargoHandling.Stage(game.save,game.save.world,"ore",1);
            game.walking=true;Set("walkPosition",game.CargoAccess);Call("RebuildCargo");
            Check((bool)Call("StartCargoTransfer","ore",true),"Loading starts at physical cargo access");
            Check(game.save.ore==0,"Cargo is not credited before the physical transfer completes");
            Call("TickCargo",2.6f);Check(game.save.ore==1&&CargoHandling.Staged(game.save,game.save.world,"ore")==0,"Completed physical loading updates both inventories");
            Check((bool)Call("StartCargoTransfer","ore",false),"Unloading starts from a loaded hold");Call("TickCargo",2.6f);
            Check(game.save.ore==0&&CargoHandling.Staged(game.save,game.save.world,"ore")==1,"Completed physical unloading conserves inventory");
            game.cargoDoor=false;game.walking=false;bool liftAlreadyReady=game.world.lift.Ready;Call("Launch");
            Check(liftAlreadyReady?game.flying:game.world.lift.Raising&&!game.flying,liftAlreadyReady?"Powered launch uses an already cleared home platform":"Powered launch first raises the home hangar lift");
            game.world.lift.Advance(9);Set("inputNeutral",false);Frame();Check(game.flying&&game.world.lift.Ready,"Flight control transfers after the lift raises and roof clears");
            Call("RespawnShip");Check(game.ship.position.y>=game.world.Deck+26+game.StandHeight-.01f,"Respawn respects a raised hangar platform");
            File.WriteAllLines("Validation/runtime-restoration-tests.txt",lines);Debug.Log("RUNTIME_RESTORATION_PASS: "+lines.Count+" actual controller/cargo checks.");
        }
        finally{
            InputSystem.RemoveDevice(mouse);if(oldMouse!=null)oldMouse.MakeCurrent();InputSystem.RemoveDevice(keyboard);if(oldKeyboard!=null)oldKeyboard.MakeCurrent();InputSystem.RemoveDevice(pad);if(oldPad!=null)oldPad.MakeCurrent();Call("ClearCombat");game.save=original;Call("RespawnShip");Call("SpawnRaiders");game.started=false;game.menu=true;
            if(had)PlayerPrefs.SetString(key,stored);else PlayerPrefs.DeleteKey(key);PlayerPrefs.Save();
        }
    }
}
