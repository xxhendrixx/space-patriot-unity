using System;
using System.Collections.Generic;
using UnityEngine;
namespace SpacePatriot
{
    [Serializable] public class FrontierMarket
    {
        public string id,name,biome,faction;public float ore,organics,crystal;public int activity;
        public float Stock(string good)=>good=="ore"?ore:good=="crystal"?crystal:organics;
        public void Add(string good,float amount){if(good=="ore")ore+=amount;else if(good=="crystal")crystal+=amount;else organics+=amount;}
    }
    [Serializable] public class TradeFaction {public string id;public float treasury,influence;}
    [Serializable] public class FrontierConvoy {public string id,from,to,good,faction;public int units;public float depart,arrive;}
    [Serializable] public class FreightJob {public string id,from,to,good,status="awaiting loading";public int units=4,reward;}
    [Serializable] public class EconomyState
    {
        public float time,nextTrade=2;public int serial;
        public List<FrontierMarket> markets=new List<FrontierMarket>();
        public List<FrontierConvoy> convoys=new List<FrontierConvoy>();
        public List<FreightJob> jobs=new List<FreightJob>();
        public List<TradeFaction> factions=new List<TradeFaction>{new(){id="union",treasury=60000,influence=34},new(){id="helix",treasury=80000,influence=36},new(){id="redwake",treasury=45000,influence=30}};
    }
    public static class FrontierEconomy
    {
        static readonly string[] Goods={"ore","organics","crystal"};
        public static void Ensure(SaveData save,WorldInfo[] worlds)
        {
            save.economy??=new EconomyState();var e=save.economy;
            for(int i=0;i<worlds.Length;i++){var w=worlds[i];if(e.markets.Exists(m=>m.id==w.id))continue;
                e.markets.Add(new FrontierMarket{id=w.id,name=w.name,biome=w.biome,faction=e.factions[i%3].id,ore=90+Mathf.Abs(w.seed%130),organics=90+Mathf.Abs((w.seed/3)%130),crystal=90+Mathf.Abs((w.seed/7)%130)});}
        }
        public static int Price(SaveData save,WorldInfo w,string good,bool buy=true)
        {
            var m=save.economy?.markets.Find(x=>x.id==w.id);if(m==null)return good=="ore"?29:good=="crystal"?65:38;
            float stock=m.Stock(good);foreach(var effect in save.stock)if(effect.world==w.name&&effect.good==good)stock+=effect.units;
            float influence=save.economy.factions.Find(x=>x.id==m.faction).influence;
            float basis=good=="ore"?26:good=="crystal"?58:34;
            return Mathf.Max(1,Mathf.RoundToInt(basis*Mathf.Clamp(180/Mathf.Max(40,stock),.55f,3)*(1+(100-influence)*.001f)*(buy?1.12f:.9f)));
        }
        public static int Reserved(SaveData s,string good){int n=0;foreach(var j in s.economy.jobs)if(j.status!="delivered"&&j.good==good)n+=j.units;return n;}
        public static bool Deliver(SaveData save,WorldInfo world,FreightJob job)
        {
            if(job==null||job.to!=world.id||job.status!="in transit"||CargoHandling.Staged(save,save.world,job.good)<job.units)return false;
            CargoHandling.Stage(save,save.world,job.good,-job.units);save.economy.markets.Find(m=>m.id==world.id).Add(job.good,job.units);
            save.credits+=job.reward;job.status="delivered";return true;
        }
        public static void Tick(SaveData save,WorldInfo[] worlds,float dt)
        {
            var e=save.economy;e.time+=dt;
            foreach(var m in e.markets)foreach(var good in Goods){float production=good=="ore"?(m.biome=="rock"||m.biome=="desert"||m.biome=="volcanic"?.35f:.08f):good=="organics"?(m.biome=="temperate"?.42f:.015f):(m.biome=="gas"||m.biome=="ice"||m.biome=="volcanic"?.22f:.045f);float demand=good=="ore"?.11f:good=="organics"?.10f:.055f;m.Add(good,Mathf.Clamp(m.Stock(good)+(production-demand)*dt,5,600)-m.Stock(good));}
            if(e.time>=e.nextTrade){e.nextTrade=e.time+5;if(e.convoys.Count<60){var from=worlds[e.serial%worlds.Length];var siblings=Array.FindAll(worlds,w=>w.system==from.system&&w.id!=from.id);var to=siblings.Length>0?siblings[(e.serial+1)%siblings.Length]:worlds[(e.serial+7)%worlds.Length];string good=Goods[e.serial%3];var m=e.markets.Find(x=>x.id==from.id);var f=e.factions.Find(x=>x.id==m.faction);int units=Mathf.Min(14,Mathf.FloorToInt(m.Stock(good)/5)),cost=units*Price(save,from,good,false);
                    if(units>0&&f.treasury>=cost){m.Add(good,-units);f.treasury-=cost;e.convoys.Add(new FrontierConvoy{id="trade-"+e.serial,from=from.id,to=to.id,good=good,units=units,faction=f.id,depart=e.time,arrive=e.time+65+e.serial%7*18});}e.serial++;}}
            for(int i=e.convoys.Count-1;i>=0;i--){var v=e.convoys[i];if(v.arrive>e.time)continue;var m=e.markets.Find(x=>x.id==v.to);var f=e.factions.Find(x=>x.id==v.faction);m.Add(v.good,v.units);m.activity++;f.treasury+=v.units*Price(save,Array.Find(worlds,w=>w.id==v.to),v.good);f.influence=Mathf.Clamp(f.influence+.08f,10,80);e.convoys.RemoveAt(i);}
        }
    }
    public partial class FrontierGame
    {
        float marketAccumulator;
        void TickEconomy(float dt){if(!started)return;marketAccumulator+=dt;if(marketAccumulator<.5f)return;FrontierEconomy.Tick(save,worlds,marketAccumulator);marketAccumulator=0;}
        void ContractsPanel()
        {
            Text("FREIGHT CONTRACTS / "+CurrentWorld.name.ToUpperInvariant(),400,235,910,29,17,amber,true);
            var destinations=Array.FindAll(worlds,w=>w.id!=CurrentWorld.id&&w.system==CurrentWorld.system);
            string[] goods={"ore","organics","crystal"};for(int i=0;i<Mathf.Min(3,destinations.Length);i++){
                var d=destinations[i];string id=CurrentWorld.id+":"+d.id,good=goods[i];var existing=save.economy.jobs.Find(j=>j.id==id);float y=303+i*83;
                Text(d.name+" / 4 "+good,400,y,550,28,21,paper,true);Text((240+i*120)+" CR   /   sealed delivery",400,y+34,550,25,15,muted);
                if(Button(existing?.status??"ACCEPT",1010,y,300,46,false,AtPort&&existing==null&&save.economy.markets.Find(m=>m.id==CurrentWorld.id).Stock(good)>=4)){
                    save.economy.jobs.Add(new FreightJob{id=id,from=CurrentWorld.id,to=d.id,good=good,reward=240+i*120});save.economy.markets.Find(m=>m.id==CurrentWorld.id).Add(good,-4);CargoHandling.Stage(save,save.world,good,4);RebuildCargo();Save();Toast("Contract cargo staged at the dock. Load all four units before departing.");}}
            float row=584;foreach(var job in save.economy.jobs){if(job.to!=CurrentWorld.id||job.status=="delivered")continue;
                if(Button("HAND OVER UNLOADED "+job.good.ToUpperInvariant()+"  /  "+job.reward+" CR",400,row,910,46,true,AtPort&&job.status=="in transit"&&CargoHandling.Staged(save,save.world,job.good)>=job.units)&&FrontierEconomy.Deliver(save,CurrentWorld,job)){RebuildCargo();Save();Toast("Unloaded freight accepted. Payment received.");}row+=52;if(row>740)break;}
            Text("Background markets: "+save.economy.markets.Count+"   Active convoys: "+save.economy.convoys.Count,400,742,910,28,15,aqua);
        }
    }
}
