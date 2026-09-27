using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;
using SpacePatriot;
public static class LivingGameValidation
{
    public static void Run()
    {
        var log=new List<string>();void Check(bool ok,string name){if(!ok)throw new Exception(name);log.Add("PASS: "+name);}
        var worlds=JsonUtility.FromJson<WorldCatalog>(Resources.Load<TextAsset>("Worlds").text).worlds;var save=new SaveData();FrontierEconomy.Ensure(save,worlds);LivingUniverse.Ensure(save,worlds);
        Check(save.society.residents.Count>=worlds.Length*32,"Every world has persistent residents");Check(save.society.residents.Select(r=>r.id).Distinct().Count()==save.society.residents.Count,"Resident identities are unique");
        Check(save.society.residents.Where(LivingUniverse.Pilot).All(r=>r.ship>=0&&r.ship<100&&!string.IsNullOrEmpty(r.shipId)),"Every pilot owns a fleet vessel");
        for(int i=0;i<720;i++)LivingUniverse.Step(save,worlds,10);
        Check(save.society.residents.Any(r=>r.home!=r.world)&&save.society.residents.Any(r=>r.deliveries>3),"Absent-world pilots travel and finish jobs without actors or a player");
        Check(save.society.residents.Any(r=>r.friendship>0),"Residents meet one another and preserve relationships");
        Check(save.society.events.Count<=48,"Background event log stays bounded");
        var restored=JsonUtility.FromJson<SaveData>(JsonUtility.ToJson(save));Check(restored.society.residents[0].deliveries==save.society.residents[0].deliveries&&restored.society.time==save.society.time,"Jobs, owned ships and world time survive save round trip");
        var freight=new SaveData();FrontierEconomy.Ensure(freight,worlds);
        string destination=worlds[1].id,cityId=SocietyEconomy.Primary(destination);freight.settlement=cityId;
        var city=new CitySociety{id=cityId,world=destination,food=20};freight.society.cities.Add(city);
        var foodJob=new SocietyJob{id="freight-check",city=cityId,world=destination,title="Canteen supplies running low",kind="food",good="organics",units=4,deadline=5000};freight.society.jobs.Add(foodJob);
        var pilot=new Resident{id="test",name="Freight check",job="Freight pilot",home=worlds[0].id,world=worlds[0].id,shipId="owned-test",until=0};freight.society.residents.Add(pilot);
        var source=freight.economy.markets.Find(m=>m.id==worlds[0].id);var receiving=freight.economy.markets.Find(m=>m.id==destination);
        float sourceBefore=source.organics,receivingBefore=receiving.organics;int playerCredits=freight.credits;
        LivingUniverse.Step(freight,worlds,1);
        Check(pilot.destination==destination&&pilot.cargoJobId==foodJob.id&&pilot.cargoUnits==6&&Mathf.Abs(source.organics-(sourceBefore-6))<.01f,"Freighter reserves an actual offered delivery and loads six source-market crates");
        var secondPilot=new Resident{id="second",job="Freight pilot",world=worlds[2].id,shipId="second-ship"};freight.society.residents.Add(secondPilot);
        FreightLogistics.Assign(freight,worlds,secondPilot,2,0);Check(secondPilot.cargoJobId!=foodJob.id,"Two NPC pilots cannot reserve the same food delivery");freight.society.residents.Remove(secondPilot);
        var cargoSave=JsonUtility.FromJson<SaveData>(JsonUtility.ToJson(freight));Check(cargoSave.society.residents[0].cargoJobId==foodJob.id&&cargoSave.society.residents[0].cargoUnits==6,"Freight manifest and job reservation survive a save round trip");
        LivingUniverse.Step(freight,worlds,(float)(pilot.until-freight.society.time)+1);
        Check(pilot.activity=="Dock service"&&pilot.city==cityId&&receiving.organics==receivingBefore&&foodJob.status=="offered","Arrival lands at the assigned city before stock or job completion");
        Check(FreightLogistics.Visible(pilot,destination,cityId,freight.society.time)&&!FreightLogistics.Visible(pilot,destination,"other-city",freight.society.time),"Docked freighter is visible only at its assigned active port");
        var pad=new Place("Capital ship quay","landing",new Vector3(650,14.65f,230));var berth=FreightLogistics.Berth(pad,17);
        Check(Mathf.Abs(berth.y-29)<.001f&&Vector3.Distance(FreightLogistics.FlightPosition(berth,1,false),berth)<.001f&&FreightLogistics.FlightPosition(berth,0,true).y==berth.y,"Arrival and departure paths meet the constructed quay at gear height");
        var visualRoot=new GameObject("Freight visual validation");
        try
        {
            var visual=visualRoot.AddComponent<FreightShipActor>();visual.Initialize(ShipSpec.Fleet[90]);
            Transform[] Crates()=>visualRoot.GetComponentsInChildren<Transform>(true).Where(t=>t.name.StartsWith("Manifest crate ")).ToArray();
            Check(Crates().Length==6&&visualRoot.GetComponentsInChildren<Collider>(true).All(c=>!c.enabled),"Freight ship builds six nonblocking physical cargo visuals");
            visual.PoseCargo(.02f);Check(Crates().All(c=>!c.gameObject.activeSelf),"Cargo stays aboard before dock service begins");
            visual.PoseCargo(.5f);Check(Crates().Count(c=>c.gameObject.activeSelf)>0&&Crates().Count(c=>c.gameObject.activeSelf)<6,"Manifest crates unload progressively rather than appearing at once");
            visual.PoseCargo(1);Check(Crates().All(c=>c.gameObject.activeSelf),"All six crates reach the dock before transfer completion");
            visual.HideCargo();Check(Crates().All(c=>!c.gameObject.activeSelf),"Cargo visuals clear when the ship departs");
        }
        finally{UnityEngine.Object.DestroyImmediate(visualRoot);}
        float foodBeforeUnload=city.food;LivingUniverse.Step(freight,worlds,(float)(pilot.until-freight.society.time)+1);
        Check(pilot.activity=="Port turnaround"&&pilot.cargoUnits==0&&pilot.deliveries==1&&Mathf.Abs(receiving.organics-(receivingBefore+6))<.01f,"Six crates unload exactly once at the receiving market");
        Check(foodJob.status=="completed"&&foodJob.outcome.Contains(pilot.shipId)&&city.deliveries==1&&city.food>foodBeforeUnload&&freight.credits==playerCredits,"NPC freight completes the offered food job without taking player rewards");
        float afterUnload=receiving.organics;LivingUniverse.Step(freight,worlds,1);Check(receiving.organics==afterUnload&&pilot.deliveries==1,"Turnaround does not duplicate the shipment");
        var accepted=new SocietyJob{id="player-reserved",city=cityId,world=destination,title="Player delivery",kind="food",good="organics",units=4,status="accepted",deadline=9999};
        freight.society.jobs.Add(accepted);LivingUniverse.Step(freight,worlds,(float)(pilot.until-freight.society.time)+1);
        Check(pilot.activity=="In transit"&&pilot.cargoUnits==6&&FreightLogistics.Visible(pilot,destination,cityId,freight.society.time),"Counted freight ship departs the active berth after turnaround");
        Check(pilot.cargoJobId!=accepted.id&&accepted.status=="accepted","An accepted player delivery cannot be claimed by NPC freight");
        var lateAcceptance=new Resident{id="late",name="Late arrival",job="Freight pilot",world=destination,city=cityId,shipId="late-ship",cargoGood="organics",cargoUnits=6,cargoJobId=accepted.id};
        int completedDeliveries=city.deliveries;FreightLogistics.Unload(freight,lateAcceptance);
        Check(accepted.status=="accepted"&&city.deliveries==completedDeliveries&&lateAcceptance.cargoUnits==0,"A player who accepts during transit keeps the job even when NPC market cargo arrives");
        var inv=new SaveData();int rounds=inv.ammo[3].reserve;Check(!FieldInventory.Craft(inv,"ammo",false)&&inv.inventory.alloy==18,"Crafting away from a powered terminal is atomic and rejected");Check(FieldInventory.Craft(inv,"ammo",true)&&inv.ammo[3].reserve==rounds+30&&inv.inventory.alloy==12,"Original six-alloy rifle recipe feeds real weapon reserve");inv.inventory.alloy=0;float spares=inv.vessel.spares;Check(!FieldInventory.Craft(inv,"parts",true)&&inv.vessel.spares==spares,"Missing ingredients do not create repair components");inv.inventory.samples=1;Check(FieldInventory.Craft(inv,"analyze",true)&&inv.inventory.samples==0&&inv.inventory.alloy==4,"Original sample analysis recipe consumes exactly one sample");
        foreach(var family in new[]{0,7,9}){var prefab=Resources.Load<GameObject>("OriginalShips/cabin-"+family);var controls=prefab.GetComponentsInChildren<CockpitControl>();Check(controls.Count(c=>c.screen>=0)==3,"Cabin "+family+" has three independent MFD surfaces");Check(controls.Count(c=>c.action>=40&&c.action<=43)==4,"Cabin "+family+" has four operable rotary controls");Check(controls.Count(c=>c.action>=100)==24,"Cabin "+family+" has 24 independent MFD softkeys");foreach(var c in controls.Where(c=>c.screen>=0)){var uv=c.GetComponent<MeshFilter>().sharedMesh.uv;Check(uv.All(p=>p.x>=-.001f&&p.x<=1.001f&&p.y>=-.001f&&p.y<=1.001f),"MFD "+c.screen+" retains unmangled normalized UVs");}}
        Directory.CreateDirectory("Validation");File.WriteAllLines("Validation/living-game.txt",log);Debug.Log("LIVING_GAME_PASS "+log.Count);
    }
}
