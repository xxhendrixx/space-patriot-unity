using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using SpacePatriot;

public static class InversionValidation
{
    [MenuItem("Space Patriot/Validate imported surface orientation")]
    public static void Models()
    {
        var unique=new HashSet<Mesh>();int faces=0;
        foreach(var prefab in Resources.LoadAll<GameObject>("OriginalShips"))foreach(var filter in prefab.GetComponentsInChildren<MeshFilter>(true)){
            var mesh=filter.sharedMesh;if(!unique.Add(mesh))continue;var v=mesh.vertices;var n=mesh.normals;var ix=mesh.triangles;
            for(int i=0;i<ix.Length;i+=3){var cross=Vector3.Cross(v[ix[i+1]]-v[ix[i]],v[ix[i+2]]-v[ix[i]]);if(cross.sqrMagnitude<1e-12f)continue;
                if(Vector3.Dot(cross.normalized,(n[ix[i]]+n[ix[i+1]]+n[ix[i+2]]).normalized)<-.001f)throw new Exception("Inside-out surface: "+prefab.name+" / "+mesh.name+" / triangle "+i/3);faces++;}}
        Directory.CreateDirectory("Validation");File.WriteAllText("Validation/model-orientation.txt","PASS: "+unique.Count+" imported meshes; "+faces+" nondegenerate triangles agree with their outward normals.\n");
        Debug.Log("MODEL_ORIENTATION_PASS: "+unique.Count+" meshes / "+faces+" faces");
    }

    [MenuItem("Space Patriot/Validate live direction and launch controls")]
    public static void Controls()
    {
        var game=FrontierGame.Instance;if(game==null||!Application.isPlaying)throw new Exception("Enter Play mode first.");
        var flags=BindingFlags.Instance|BindingFlags.Public|BindingFlags.NonPublic;var type=typeof(FrontierGame);var lines=new List<string>();
        void Set(string name,object value)=>type.GetField(name,flags).SetValue(game,value);
        object Get(string name)=>type.GetField(name,flags).GetValue(game);
        object Call(string name,params object[] args)=>type.GetMethod(name,flags).Invoke(game,args);
        void Check(bool ok,string label){if(!ok)throw new Exception("DIRECTION TEST FAILED: "+label);lines.Add("PASS "+label);}
        var original=game.save;var originalBindings=Get("bindings");var oldKeyboard=Keyboard.current;var oldMouse=Mouse.current;var oldPad=Gamepad.current;
        var keyboard=InputSystem.AddDevice<Keyboard>();var mouse=InputSystem.AddDevice<Mouse>();var pad=InputSystem.AddDevice<Gamepad>();
        string saveKey="SpacePatriot.Unity.Frontier.v1";bool hadSave=PlayerPrefs.HasKey(saveKey);string stored=PlayerPrefs.GetString(saveKey);
        int invert=PlayerPrefs.GetInt("sp.invert",0),padInvert=PlayerPrefs.GetInt("sp.padInvert",0);float sensitivity=PlayerPrefs.GetFloat("sp.sensitivity",1);
        try{
            PlayerPrefs.SetInt("sp.invert",0);PlayerPrefs.SetInt("sp.padInvert",0);PlayerPrefs.SetFloat("sp.sensitivity",1);
            game.save=JsonUtility.FromJson<SaveData>(JsonUtility.ToJson(original));game.save.ship=0;game.save.fuel=100;game.save.vessel=new VesselState();Call("RespawnShip");
            var bindings=new FlightBindings();var names=new[]{"Forward","Reverse","Strafe left","Strafe right","Ascend","Descend","Pitch up","Pitch down","Yaw left","Yaw right","Roll left","Roll right"};
            var keys=new[]{Key.W,Key.S,Key.A,Key.D,Key.Space,Key.LeftCtrl,Key.UpArrow,Key.DownArrow,Key.LeftArrow,Key.RightArrow,Key.Q,Key.E};for(int i=0;i<names.Length;i++)bindings.entries.Find(x=>x.action==names[i]).key=keys[i];Set("bindings",bindings);
            void Reset(){game.started=true;game.menu=false;game.walking=false;game.aboard=false;game.cockpit=true;game.flying=true;game.gearDown=false;game.powered=true;game.instruments=false;game.armed=false;game.flightAssist=true;game.cruise=false;game.throttle=1;game.ship.position=new Vector3(0,game.world.Deck+150,0);game.ship.rotation=Quaternion.identity;Set("velocity",Vector3.zero);Set("angularVelocity",Vector3.zero);Set("inputNeutral",false);Set("focused",true);}
            void Frame(Key key=Key.None,Vector2 mouseDelta=default,Vector2 look=default,bool rightMouse=false,float dt=.02f){InputSystem.QueueStateEvent(keyboard,key==Key.None?new KeyboardState():new KeyboardState(key));InputSystem.QueueStateEvent(mouse,new MouseState{delta=mouseDelta,buttons=(ushort)(rightMouse?2:0)});InputSystem.QueueStateEvent(pad,new GamepadState{rightStick=look});InputSystem.Update();Call("Flight",dt);}
            Vector3 Velocity()=>(Vector3)Get("velocity");
            Reset();Frame(Key.UpArrow);Check(game.ship.forward.y>0,"Up arrow pitches nose upward");Reset();Frame(Key.DownArrow);Check(game.ship.forward.y<0,"Down arrow pitches nose downward");
            Reset();Frame(Key.RightArrow);Check(game.ship.forward.x>0,"Right arrow yaws nose right");Reset();Frame(Key.LeftArrow);Check(game.ship.forward.x<0,"Left arrow yaws nose left");
            Reset();Frame(Key.Q);Check(game.ship.right.y>0,"Q rolls left wing down");Reset();Frame(Key.E);Check(game.ship.right.y<0,"E rolls right wing down");
            Reset();game.ship.rotation=Quaternion.Euler(0,90,0);Frame(Key.W);Check(Velocity().x>0&&Mathf.Abs(Velocity().z)<.001f,"Forward thrust follows the ship nose after yawing");
            Reset();game.ship.rotation=Quaternion.Euler(0,90,0);Frame(Key.S);Check(Velocity().x<0,"Reverse thrust follows the ship tail after yawing");
            Reset();Frame(mouseDelta:new Vector2(0,20),rightMouse:true);Check(game.ship.forward.y>0,"Mouse up pitches up in normal mode");var mouseAttitude=game.ship.rotation;Frame(rightMouse:true);Check(Quaternion.Angle(mouseAttitude,game.ship.rotation)<.001f,"Mouse stops steering when mouse movement stops");
            Reset();Frame(mouseDelta:new Vector2(20,0),rightMouse:true);Check(game.ship.forward.x>0,"Mouse right yaws right");
            Reset();Frame(mouseDelta:new Vector2(0,20),rightMouse:true,dt:1/30f);var slow=game.ship.rotation;Reset();Frame(mouseDelta:new Vector2(0,20),rightMouse:true,dt:1/120f);Check(Quaternion.Angle(slow,game.ship.rotation)<.001f,"Mouse angle is independent of frame duration");
            PlayerPrefs.SetInt("sp.invert",1);Reset();Frame(mouseDelta:new Vector2(0,20),rightMouse:true);Check(game.ship.forward.y<0,"Mouse inversion setting reverses only vertical look");PlayerPrefs.SetInt("sp.invert",0);
            Reset();Frame(look:Vector2.up);Check(game.ship.forward.y>0,"Right stick up pitches up in normal mode");Reset();Frame(look:Vector2.right);Check(game.ship.forward.x>0,"Right stick right yaws right");
            PlayerPrefs.SetInt("sp.padInvert",1);Reset();Frame(look:Vector2.up);Check(game.ship.forward.y<0,"Stick inversion preference works");PlayerPrefs.SetInt("sp.padInvert",0);
            Reset();Set("inputNeutral",true);Frame(Key.W);Check(Velocity().z>0,"Returning from menus cannot lock out keyboard forward thrust");
            Reset();Set("inputNeutral",true);Frame(Key.Space);Check(Velocity().y>0,"Returning from menus cannot lock out held vertical thrust");
            Reset();game.flying=false;game.ship.position=new Vector3(165,game.world.Deck+game.StandHeight,155);Set("inputNeutral",true);Frame(Key.Space);Check(game.flying,"Held Space launches from a ready berth after menu recovery");Frame(Key.Space);Check(Velocity().y>2,"Continuing to hold Space supplies thrust immediately after launch");
            Call("Land",game.world.Nearest(game.ship.position,"landing"));Check(game.throttle>0,"Landing retains a usable speed limit");Call("Launch");Frame(Key.W);Check(Velocity().z>0,"Forward thrust still works after landing and relaunching");
            game.walking=true;Set("walkPosition",new Vector3(10,game.world.Deck+1.75f,10));Set("walkYaw",0f);Set("walkPitch",0f);InputSystem.QueueStateEvent(keyboard,new KeyboardState());InputSystem.QueueStateEvent(mouse,new MouseState{delta=new Vector2(15,20),buttons=2});InputSystem.Update();Call("Walk",.02f);Call("FollowCamera",.02f);Check(game.view.transform.forward.x>0&&game.view.transform.forward.y>0,"On-foot mouse up/right looks up/right");
            Directory.CreateDirectory("Validation");File.WriteAllLines("Validation/direction-and-launch.txt",lines);Debug.Log("DIRECTION_LAUNCH_PASS: "+lines.Count);
        }
        finally{
            PlayerPrefs.SetInt("sp.invert",invert);PlayerPrefs.SetInt("sp.padInvert",padInvert);PlayerPrefs.SetFloat("sp.sensitivity",sensitivity);
            InputSystem.RemoveDevice(keyboard);InputSystem.RemoveDevice(mouse);InputSystem.RemoveDevice(pad);if(oldKeyboard!=null)oldKeyboard.MakeCurrent();if(oldMouse!=null)oldMouse.MakeCurrent();if(oldPad!=null)oldPad.MakeCurrent();
            Set("bindings",originalBindings);game.save=original;Call("RespawnShip");game.started=false;game.menu=true;Call("SetInitialCamera");
            if(hadSave)PlayerPrefs.SetString(saveKey,stored);else PlayerPrefs.DeleteKey(saveKey);PlayerPrefs.Save();
        }
    }
}
