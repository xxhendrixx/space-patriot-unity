using System;
using System.Collections.Generic;
using UnityEngine;
namespace SpacePatriot
{
    [Serializable] public class VesselComponent {public string id;public float health=100,temperature=24;public bool enabled=true;public VesselComponent(string key){id=key;}}
    [Serializable] public class VesselState
    {
        public int engines=4,weapons=4,shields=4;
        public float pressure=100,spares=120;
        public string repairing="";
        public List<VesselComponent> components=new List<VesselComponent>{new("reactor"),new("engines"),new("weapons"),new("shields"),new("cooler"),new("lifeSupport")};
        public VesselComponent Get(string id)=>components.Find(c=>c.id==id);
        public int Allocation(string id)=>id=="engines"?engines:id=="weapons"?weapons:id=="shields"?shields:4;
        public float Factor(string id,bool power)
        {var c=Get(id);var reactor=Get("reactor");if(!power||!c.enabled||!reactor.enabled)return 0;return c.health/100*reactor.health/100*Mathf.Clamp(1-Mathf.Max(0,c.temperature-82)/48,.15f,1)*Allocation(id)/4f;}
        public bool Allocate(string id,int delta)
        {
            if(Mathf.Abs(delta)!=1||id!="engines"&&id!="weapons"&&id!="shields")return false;
            var values=new[]{engines,weapons,shields};int k=id=="engines"?0:id=="weapons"?1:2;
            if(values[k]+delta<0||values[k]+delta>10)return false;
            int other=-1;for(int i=0;i<3;i++)if(i!=k&&(delta>0?values[i]>0:values[i]<10)&&(other<0||(delta>0?values[i]>values[other]:values[i]<values[other])))other=i;
            if(other<0)return false;values[k]+=delta;values[other]-=delta;engines=values[0];weapons=values[1];shields=values[2];return true;
        }
        public void Tick(float dt,float thrust,float heat,bool power,bool nav)
        {
            float cooling=Factor("cooler",power);foreach(var c in components){float load=c.id=="engines"?thrust:c.id=="weapons"?heat/100:.15f;
                float target=24+(c.enabled?load*46+heat*.38f+Mathf.Max(0,Allocation(c.id)-4)*3:0);
                c.temperature+=(target-c.temperature)*Mathf.Min(1,dt*(.22f+.15f*cooling));if(c.temperature>100)c.health=Mathf.Max(0,c.health-dt*.18f);}
            pressure=Mathf.Clamp(pressure+dt*(Factor("lifeSupport",power)>.15f?1.5f:-.7f),0,100);
            if(repairing!=""){var c=Get(repairing);if(c==null||c.enabled||c.health>=100||spares<=0)repairing="";else{float amount=Mathf.Min(dt*3,spares,100-c.health);c.health+=amount;spares-=amount;}}
        }
    }
    public partial class FrontierGame
    {
        float systemsHull=100;
        void TickVessel(float dt)
        {
            if(!started||menu||dead)return;var s=save.vessel;
            float damage=Mathf.Max(0,systemsHull-save.hull);systemsHull=save.hull;
            if(damage>0){string[] choices={"engines","cooler","weapons","shields"};var c=s.Get(choices[save.kills%4]);c.health=Mathf.Max(0,c.health-damage*.6f);}
            s.Tick(dt,flying?Mathf.Clamp01(speed/Spec.speed):0,heat,powered,cruise);
            heat=Mathf.MoveTowards(heat,0,dt*18*s.Factor("cooler",powered));
            if(cruise)shield=Mathf.MoveTowards(shield,0,dt*16);else if(Time.time-hitTime>6)shield=Mathf.MoveTowards(shield,100,dt*7*s.Factor("shields",powered));
        }
        void SystemsPanel()
        {
            var s=save.vessel;Text("POWER ALLOCATION / 12 POINTS",400,230,730,26,15,amber,true);
            string[] buses={"engines","weapons","shields"};for(int i=0;i<3;i++){float x=400+i*305;string bus=buses[i];Text(bus.ToUpperInvariant()+"  "+s.Allocation(bus),x,273,210,28,19,paper,true);
                if(Button("−",x,317,93,36))s.Allocate(bus,-1);if(Button("+",x+104,317,93,36))s.Allocate(bus,1);}
            Rule(400,376,910);
            for(int i=0;i<s.components.Count;i++){var c=s.components[i];float y=399+i*45;
                Text(c.id.ToUpperInvariant(),400,y,205,24,15,paper,true);Text(c.health.ToString("0")+"%   "+c.temperature.ToString("0")+" °C",615,y,235,28,16,c.health<35?amber:aqua);
                if(Button(c.enabled?"ONLINE":"OFFLINE",860,y-7,172,35,c.enabled)){c.enabled=!c.enabled;Save();}
                if(Button(s.repairing==c.id?"REPAIRING":"REPAIR",1049,y-7,247,35,false,!c.enabled&&c.health<100&&s.spares>0)){s.repairing=c.id;Save();}}
            Text("CABIN PRESSURE  "+s.pressure.ToString("0")+"%     SPARES  "+s.spares.ToString("0")+"     MODE  "+(cruise?"NAV / WEAPONS SAFE":"SCM"),400,696,918,35,16,amber);
            Text("Disable a damaged component before repairing it. Power, temperature and health affect thrust, cooling and shields.",400,737,909,35,14,muted);
        }
    }
}
