using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using SpacePatriot;
public static class SocietyDeckValidation
{
    public static void Logic()
    {
        var log=new List<string>();void Check(bool value,string name){if(!value)throw new Exception(name);log.Add("PASS "+name);}
        var worlds=JsonUtility.FromJson<WorldCatalog>(Resources.Load<TextAsset>("Worlds").text).worlds;var s=new SaveData();FrontierEconomy.Ensure(s,worlds);LivingUniverse.Ensure(s,worlds);
        Check(SocietyEconomy.Catalog.Length==420,"All 420 original named settlements are addressable");
        Check(s.society.cities.Count==420&&s.society.residents.Count>4000,"Every settlement owns persistent service state and residents");
        int population=s.society.residents.Count;LivingUniverse.Ensure(s,worlds);Check(population==s.society.residents.Count,"Save migration is idempotent");
        Check(s.society.residents.Select(r=>r.id).Distinct().Count()==population,"Expanded resident IDs remain unique");
        var city=SocietyEconomy.City(s,s.settlement);city.power=45;city.food=20;city.water=40;city.health=40;city.security=50;city.days=2;
        LivingUniverse.Step(s,worlds,21);Check(new[]{"repair","food","water","medical","patrol","courier"}.All(k=>s.society.jobs.Exists(j=>j.city==city.id&&j.kind==k)),"Local failures create six distinct actionable job types");
        var repair=s.society.jobs.Find(j=>j.city==city.id&&j.kind=="repair");SocietyEconomy.Accept(s,repair);float parts=s.vessel.spares;int money=s.credits;
        Check(!SocietyEconomy.Complete(s,repair,city.id,2)&&s.vessel.spares==parts&&s.credits==money,"Repair cannot pay before the bus puzzle is completed");
        s.vessel.spares=2;Check(SocietyEconomy.Complete(s,repair,city.id,2,true)&&s.vessel.spares==0&&city.power==100,"Repair consumes two real components and restores city power");
        money=s.credits;Check(!SocietyEconomy.Complete(s,repair,city.id,2,true)&&s.credits==money,"Completed jobs cannot pay twice");
        var food=s.society.jobs.Find(j=>j.city==city.id&&j.kind=="food");SocietyEconomy.Accept(s,food);s.organics=10;
        Check(!SocietyEconomy.Complete(s,food,city.id,1),"Ship manifest alone cannot fulfil dock delivery");CargoHandling.Stage(s,s.world,"organics",4);
        Check(SocietyEconomy.Complete(s,food,city.id,1)&&CargoHandling.Staged(s,s.world,"organics")==0&&s.organics==10,"Unloaded job cargo is consumed exactly once");
        CargoHandling.Stage(s,s.world,"ore",3);string originalDock=s.settlement;s.settlement=SocietyEconomy.Catalog.First(c=>c.world==worlds[s.world].id&&c.id!=originalDock).id;
        Check(CargoHandling.Staged(s,s.world,"ore")==0&&!CargoHandling.Transfer(s,s.world,"ore",32,true),"Two cities on the same world cannot share dock cargo");s.settlement=originalDock;Check(CargoHandling.Staged(s,s.world,"ore")==3,"Cargo remains at the source settlement after regional travel");
        var vale=s.society.residents.First(r=>r.person=="vale"&&r.city==s.settlement);vale.contractRequested=true;s.inventory.alloy=6;int rounds=s.ammo[3].reserve;
        Check(SocietyConversation.Deliver(s,vale)&&s.inventory.alloy==0&&s.ammo[3].reserve==rounds+30,"Original Vale side contract consumes alloy and delivers working ammunition");Check(!SocietyConversation.Deliver(s,vale),"Named side contracts cannot pay twice");
        var courier=s.society.jobs.Find(j=>j.city==city.id&&j.kind=="courier");SocietyEconomy.Accept(s,courier);Check(!SocietyEconomy.Complete(s,courier,city.id,3)&&courier.stage==0,"Courier cannot skip pickup");SocietyEconomy.Complete(s,courier,city.id,1);Check(courier.stage==1&&SocietyEconomy.Complete(s,courier,city.id,3),"Courier must visit freight office then market");
        var remote=s.society.cities.Find(c=>c.world!=worlds[s.world].id);float before=remote.food;LivingUniverse.Step(s,worlds,25);Check(remote.food!=before,"Absent settlement consumption continues without loaded actors");
        var restored=JsonUtility.FromJson<SaveData>(JsonUtility.ToJson(s));Check(restored.society.cities.Count==420&&restored.society.jobs.Find(j=>j.id==repair.id).status=="completed","Settlement services and quest outcomes survive saving");
        var catalog=JsonUtility.FromJson<DeckCatalog>(Resources.Load<TextAsset>("DeckPlans").text);
        foreach(var plan in catalog.plans){int expected=plan.family==9?4:plan.family==7?3:new[]{2,5,6}.Contains(plan.family)?2:1;Check(plan.decks.Length==expected,"Family "+plan.family+" has "+expected+" actual decks");var open=new HashSet<string>(plan.doors.Select(d=>d.id));
            foreach(var level in plan.decks){
                // Explore the authoritative collision space on a 25 cm grid from each service lift.
                var seen=new HashSet<Vector2Int>();var queue=new Queue<Vector2Int>();var start=new Vector2Int(0,plan.decks.Length>1?20:8);seen.Add(start);queue.Enqueue(start);
                var dir=new[]{Vector2Int.up,Vector2Int.down,Vector2Int.left,Vector2Int.right};
                while(queue.Count>0){var p=queue.Dequeue();foreach(var d in dir){var q=p+d;if(seen.Contains(q)||q.x< -55||q.x>55||q.y< -3||q.y>plan.end*4)continue;if(!FrontierGame.DeckWalkable(plan,open,new Vector3(q.x*.25f,level.y,-q.y*.25f)))continue;seen.Add(q);queue.Enqueue(q);}}
                foreach(var station in plan.stations.Where(t=>t.deck==level.index))Check(seen.Any(p=>Vector2.Distance(new Vector2(p.x*.25f,p.y*.25f),new Vector2(station.x,station.z))<1.25f),"Reachable family "+plan.family+" deck "+level.index+" "+station.name);
                foreach(var room in plan.rooms.Where(r=>r.deck==level.index))Check(seen.Any(p=>p.x*.25f>room.x0+.4f&&p.x*.25f<room.x1-.4f&&p.y*.25f>room.z0+.4f&&p.y*.25f<room.z1-.4f),"Enterable family "+plan.family+" deck "+level.index+" "+room.id);
            }
        }
        File.WriteAllLines("Validation/society-and-decks.txt",log);Debug.Log("SOCIETY_DECK_LOGIC_PASS "+log.Count);
    }
    public static void Runtime()
    {
        using var scope=new ValidationInputScope();var g=FrontierGame.Instance;if(!Application.isPlaying||g==null)throw new Exception("Play mode required");
        var flags=BindingFlags.Instance|BindingFlags.NonPublic|BindingFlags.Public;var t=typeof(FrontierGame);object Get(string n)=>t.GetField(n,flags).GetValue(g);void Set(string n,object v)=>t.GetField(n,flags).SetValue(g,v);object Call(string n,params object[] args)=>t.GetMethod(n,flags).Invoke(g,args);
        var log=new List<string>();void Check(bool v,string n){if(!v)throw new Exception(n);log.Add("PASS "+n);}
        var original=g.save;var previousKeyboard=Keyboard.current;var previousMouse=Mouse.current;var kb=InputSystem.AddDevice<Keyboard>();var mouse=InputSystem.AddDevice<Mouse>();string key="SpacePatriot.Unity.Frontier.v1",stored=PlayerPrefs.GetString(key);bool had=PlayerPrefs.HasKey(key);
        try{
            g.save=JsonUtility.FromJson<SaveData>(JsonUtility.ToJson(original));g.save.ship=0;Call("RespawnShip");g.started=true;g.menu=false;g.cockpit=true;g.walking=false;g.aboard=false;Set("focused",true);Set("inputNeutral",false);Call("FollowCamera",10f);Physics.SyncTransforms();
            var dial=g.cabin.GetComponentsInChildren<CockpitControl>().First(c=>c.action==43);var bounds=dial.GetComponent<Renderer>().bounds;var screen=g.view.WorldToScreenPoint(bounds.center);
            InputSystem.QueueStateEvent(mouse,new MouseState{position=new Vector2(screen.x,screen.y),scroll=new Vector2(0,120)});InputSystem.Update();float limit=g.throttle;Call("PointCockpit");Check(g.throttle>limit,"Raycast on physical DRIVE knob changes actual speed limit");
            var soft=g.cabin.GetComponentsInChildren<CockpitControl>().First(c=>c.action==101);screen=g.view.WorldToScreenPoint(soft.GetComponent<Renderer>().bounds.center);var pages=(int[])Get("mfdPage");int page=pages[0];InputSystem.ResetDevice(mouse);InputSystem.QueueStateEvent(mouse,new MouseState{position=new Vector2(screen.x,screen.y),buttons=1});InputSystem.Update();Call("PointCockpit");Check(pages[0]!=page,"Clicking a physical MFD softkey switches the live page");
            Call("UpdateMfd");var screens=(MfdCanvas[])Get("mfd");Check(screens.Select(s=>s.texture.GetInstanceID()).Distinct().Count()==3,"Three MFDs have independent live textures");
            foreach(int ship in new[]{20,70,90}){g.save.ship=ship;Call("RespawnShip");g.aboard=true;g.walking=false;Set("deckPosition",new Vector3(0,0,-5));int levels=((DeckPlan)Get("activeDeck")).decks.Length;
                for(int n=1;n<levels;n++){InputSystem.QueueStateEvent(kb,new KeyboardState());InputSystem.Update();InputSystem.QueueStateEvent(kb,new KeyboardState(Key.E));InputSystem.Update();Call("WalkDeck",.02f);InputSystem.QueueStateEvent(kb,new KeyboardState());InputSystem.Update();for(int i=0;i<120;i++)Call("WalkDeck",.02f);Check(Mathf.Abs(((Vector3)Get("deckPosition")).y+n*3.3f)<.01f,"Actual service lift reaches deck "+(n+1)+" aboard "+g.Spec.name);}
            }
            Check(g.world.cityCheckpoints.Count==7&&g.world.places.Count(p=>p.kind.StartsWith("city-"))==7,"All seven city service terminals exist in the generated world");
            var shutter=g.cabin.GetComponentsInChildren<OriginalDoorPart>().Last();shutter.SetOpen(false,10);float closedHeight=shutter.GetComponent<Renderer>().bounds.size.y;shutter.SetOpen(true,10);
            Check(closedHeight>2.5f&&shutter.GetComponent<Renderer>().bounds.size.y<.15f,"Open bulkheads retract within their lintels instead of occupying the deck above");
            Call("BoardOrExit");Call("BoardOrExit");Check(((Transform)Get("deckLiftPlatform")).localPosition.y== -1.7f,"Returning to the bridge resets the service platform to the embarkation deck");
            File.WriteAllLines("Validation/society-runtime.txt",log);
        }
        finally{InputSystem.RemoveDevice(kb);InputSystem.RemoveDevice(mouse);if(previousKeyboard!=null)previousKeyboard.MakeCurrent();if(previousMouse!=null)previousMouse.MakeCurrent();g.save=original;Call("RespawnShip");g.started=false;g.menu=true;if(had)PlayerPrefs.SetString(key,stored);else PlayerPrefs.DeleteKey(key);PlayerPrefs.Save();}
    }
}
