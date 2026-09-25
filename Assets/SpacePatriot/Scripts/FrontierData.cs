using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpacePatriot
{
    [Serializable] public class WorldCatalog { public WorldInfo[] worlds; }
    [Serializable] public class WorldInfo
    {
        public string id, name, system, biome;
        public int seed;
        public float temperature, radius;
        public Color Surface => biome switch {
            "temperate" => new Color(.22f,.28f,.22f), "desert" => new Color(.43f,.23f,.14f),
            "ice" => new Color(.39f,.48f,.51f), "volcanic" => new Color(.22f,.18f,.16f),
            "gas" => new Color(.29f,.37f,.44f), _ => new Color(.31f,.29f,.25f) };
    }
    [Serializable] public class CampaignCatalog { public CaseFile[] arcs; }
    [Serializable] public class CaseFile
    {
        public string id, title, speaker, brief;
        public string[] requires;
        public CaseStep[] steps;
        public CaseChoice[] choices;
    }
    [Serializable] public class CaseStep { public string kind, world, objective, report, good; public int units; }
    [Serializable] public class MarketEffect { public string world, good; public int stock; }
    [Serializable] public class CaseChoice
    {
        public string label, faction, ending;
        public int standing, credits;
        public MarketEffect market;
    }
    [Serializable] public class CaseProgress { public string id; public int step, choice=-1; public bool accepted; }
    [Serializable] public class StockChange { public string world, good; public int units; }
    [Serializable] public class SaveData
    {
        public int version=1, world=2, ship, credits=1800, organics=4, ore, crystal;
        public int union, helix, redwake, kills;
        public float hull=100, fuel=100;
        public bool striderOwned, wayfarerOwned;
        public List<CaseProgress> cases=new List<CaseProgress>();
        public List<StockChange> stock=new List<StockChange>();
        public List<string> journal=new List<string>();
    }
    public sealed class ShipSpec
    {
        public string name, designation, role, description;
        public float speed, thrust, turn, health;
        public int capacity, price;
        public Color paint;
        public ShipSpec(string n,string d,string r,string b,float s,float a,float t,float hp,int c,int p,Color col)
        { name=n;designation=d;role=r;description=b;speed=s;thrust=a;turn=t;health=hp;capacity=c;price=p;paint=col; }
        public static readonly ShipSpec[] Fleet={
            new ShipSpec("MERIDIAN","MC–12","UTILITY CUTTER","A patched courier with honest handling. Twin ducted drives, a compact pressure cabin, and room for the cargo that keeps a district alive.",105,32,62,100,24,0,new Color(.64f,.59f,.43f)),
            new ShipSpec("STRIDER","SR–08","INTERCEPTOR","Narrow fuselage, split outriggers, generous cooling. Trades cargo space for acceleration and a quicker firing cycle.",155,49,86,80,12,2500,new Color(.32f,.41f,.43f)),
            new ShipSpec("WAYFARER","WF–40","FREIGHT HAULER","A broad working deck between four thrust nacelles. Heavy armor and a large hold; plan the braking distance before committing to an approach.",78,22,43,155,56,5200,new Color(.49f,.39f,.29f))
        };
    }
    public static class Progression
    {
        public static CaseProgress Get(SaveData save,string id)
        {
            var p=save.cases.Find(x=>x.id==id);
            if(p==null){p=new CaseProgress{id=id};save.cases.Add(p);} return p;
        }
        public static bool Unlocked(SaveData save,CaseFile file)
        {
            foreach(var id in file.requires) if(Get(save,id).choice<0) return false;
            return true;
        }
        public static int Cargo(SaveData s,string good)=>good=="ore"?s.ore:good=="crystal"?s.crystal:s.organics;
        public static void AddCargo(SaveData s,string good,int amount)
        { if(good=="ore")s.ore+=amount;else if(good=="crystal")s.crystal+=amount;else s.organics+=amount; }
        public static int Used(SaveData s)=>s.organics+s.ore+s.crystal;
        public static int Price(SaveData s,WorldInfo w,string good)
        {
            int basis=good=="organics"?42:good=="ore"?65:110;
            int scarcity=good=="organics" && w.biome!="temperate"?27:good=="ore" && w.biome=="rock"?-16:0;
            int help=0;foreach(var c in s.stock)if(c.world==w.name&&c.good==good)help+=c.units;
            return Mathf.Max(12,basis+scarcity+(w.seed%19)-Mathf.Min(30,help/3));
        }
        public static bool CompleteStep(SaveData save,CaseFile file,string world,string kind,out string report)
        {
            report=null;var p=Get(save,file.id);
            if(!p.accepted||p.choice>=0||p.step>=file.steps.Length)return false;
            var step=file.steps[p.step];
            if(step.world!=world||step.kind!=kind)return false;
            if(step.kind=="delivery")
            { if(Cargo(save,step.good)<step.units)return false; AddCargo(save,step.good,-step.units); }
            report=step.report;p.step++;save.journal.Add(file.title+" — "+report);return true;
        }
        public static bool Resolve(SaveData save,CaseFile file,int index)
        {
            var p=Get(save,file.id);
            if(!p.accepted||p.choice>=0||p.step<file.steps.Length||index<0||index>=file.choices.Length)return false;
            var c=file.choices[index];p.choice=index;save.credits+=c.credits;
            if(c.faction=="union")save.union+=c.standing;else if(c.faction=="helix")save.helix+=c.standing;else save.redwake+=c.standing;
            save.stock.Add(new StockChange{world=c.market.world,good=c.market.good,units=c.market.stock});
            save.journal.Add(file.title+" — "+c.ending);return true;
        }
    }
}
