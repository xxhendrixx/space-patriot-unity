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
        var freight=new SaveData();FrontierEconomy.Ensure(freight,worlds);var pilot=new Resident{id="test",name="Freight check",job="Freight pilot",home=worlds[0].id,world=worlds[0].id,shipId="owned-test",until=0};freight.society.residents.Add(pilot);float before=freight.economy.markets.Sum(m=>m.organics);LivingUniverse.Step(freight,worlds,1);Check(Mathf.Abs(freight.economy.markets.Sum(m=>m.organics)-(before-6))<.01f,"Freighter loads actual source-market cargo");LivingUniverse.Step(freight,worlds,(float)(pilot.until-freight.society.time)+1);Check(Mathf.Abs(freight.economy.markets.Sum(m=>m.organics)-before)<.01f&&pilot.deliveries==1,"Delivery conserves cargo and applies destination stock once");
        var inv=new SaveData();int rounds=inv.ammo[3].reserve;Check(!FieldInventory.Craft(inv,"ammo",false)&&inv.inventory.alloy==18,"Crafting away from a powered terminal is atomic and rejected");Check(FieldInventory.Craft(inv,"ammo",true)&&inv.ammo[3].reserve==rounds+30&&inv.inventory.alloy==12,"Original six-alloy rifle recipe feeds real weapon reserve");inv.inventory.alloy=0;float spares=inv.vessel.spares;Check(!FieldInventory.Craft(inv,"parts",true)&&inv.vessel.spares==spares,"Missing ingredients do not create repair components");inv.inventory.samples=1;Check(FieldInventory.Craft(inv,"analyze",true)&&inv.inventory.samples==0&&inv.inventory.alloy==4,"Original sample analysis recipe consumes exactly one sample");
        foreach(var family in new[]{0,7,9}){var prefab=Resources.Load<GameObject>("OriginalShips/cabin-"+family);var controls=prefab.GetComponentsInChildren<CockpitControl>();Check(controls.Count(c=>c.screen>=0)==3,"Cabin "+family+" has three independent MFD surfaces");Check(controls.Count(c=>c.action>=40&&c.action<=43)==4,"Cabin "+family+" has four operable rotary controls");Check(controls.Count(c=>c.action>=100)==24,"Cabin "+family+" has 24 independent MFD softkeys");foreach(var c in controls.Where(c=>c.screen>=0)){var uv=c.GetComponent<MeshFilter>().sharedMesh.uv;Check(uv.All(p=>p.x>=-.001f&&p.x<=1.001f&&p.y>=-.001f&&p.y<=1.001f),"MFD "+c.screen+" retains unmangled normalized UVs");}}
        Directory.CreateDirectory("Validation");File.WriteAllLines("Validation/living-game.txt",log);Debug.Log("LIVING_GAME_PASS "+log.Count);
    }
}
