using System;
using System.Collections.Generic;
using UnityEngine;
namespace SpacePatriot
{
    [Serializable] public class SettlementCatalog {public SettlementInfo[] settlements;}
    [Serializable] public class SettlementInfo {public string id,world,name,kind;public int seed;public bool primary;}
    [Serializable] public class CitySociety
    {
        public string id,world,owner="union";public float food=75,water=90,power=95,health=90,security=85,prosperity=50;
        public int repairs,deliveries,crime,days;public double nextIncident=300;
    }
    [Serializable] public class SocialBond {public string a,b;public int trust,meetings;}
    [Serializable] public class SocietyJob
    {
        public string id,city,world,issuer,title,brief,kind,good,status="offered",target="",outcome="";
        public int units,reward,stage;public double created,deadline;public bool urgent;
    }
    public static class SocietyEconomy
    {
        static SettlementInfo[] catalog;
        public static SettlementInfo[] Catalog=>catalog??=JsonUtility.FromJson<SettlementCatalog>(Resources.Load<TextAsset>("Settlements").text).settlements;
        public static string Primary(string world)=>world+":city:0";
        public static CitySociety City(SaveData save,string id)=>save.society.cities.Find(c=>c.id==id);
        public static void Ensure(SaveData save,WorldInfo[] worlds)
        {
            var s=save.society;s.cities??=new();s.bonds??=new();s.jobs??=new();
            foreach(var info in Catalog){if(s.cities.Exists(c=>c.id==info.id))continue;s.cities.Add(new CitySociety{id=info.id,world=info.world,owner=new[]{"union","helix","redwake"}[info.seed%3],food=45+info.seed%40,power=65+info.seed%31,water=60+info.seed%30,nextIncident=120+info.seed%900});}
            foreach(var r in s.residents)if(string.IsNullOrEmpty(r.city)){r.city=Primary(r.world);r.homeCity=Primary(r.home);r.faction=City(save,r.city)?.owner??"union";r.homeNode=5;r.workNode=r.job=="Port engineer"?2:r.job=="Merchant"?3:r.job=="Medic"?4:r.job=="Farmer"?6:1;}
            if(s.version<2){
                foreach(var info in Catalog){if(info.primary)continue;int count=info.kind=="city"?12:6;
                    for(int i=0;i<count;i++){string job=new[]{"Dockworker","Port engineer","Merchant","Medic","Farmer","Freight pilot"}[i%6];s.residents.Add(new Resident{id=info.id+"-citizen-"+i,name=new[]{"Tamsin","Elias","Nadia","Amir","Leonie","Ada","Jun","Kellan"}[(info.seed+i)%8]+" "+new[]{"Cho","Venn","Serrat","Keene","Park","Okoro","Mercer","Reyes"}[(info.seed/8+i*3)%8],job=job,home=info.world,world=info.world,city=info.id,homeCity=info.id,faction=City(save,info.id).owner,homeNode=5,workNode=i%7,shift=i%3,until=30+i*19+info.seed%60,shipId=job.Contains("pilot")?info.id+"-ship-"+i:"",ship=job.Contains("pilot")?20+info.seed%10:0});}
                }
                s.version=2;
            }
            foreach(var w in worlds)for(int k=0;k<3;k++){var named=s.residents.Find(r=>r.id==w.id+"-resident-"+k);if(named==null||named.person!="")continue;named.person=new[]{"rook","vale","mara"}[k];if(w.name=="Earth")named.name=new[]{"Ivo Rook","Seren Vale","Dr. Mara Sol"}[k];named.fromNode=7;named.toNode=8;named.depart=s.time;named.until=s.time+120;named.job=new[]{"Freight pilot","Merchant","Medic"}[k];if(k>0)named.shipId="";else named.ship=w.seed%5==0?90:70;}
            if(string.IsNullOrEmpty(save.settlement)||Array.Find(Catalog,c=>c.id==save.settlement&&c.world==worlds[save.world].id)==null)save.settlement=Primary(worlds[save.world].id);
        }
        public static void Advance(SaveData save,float dt)
        {
            var s=save.society;s.cityClock+=dt;if(s.cityClock<20)return;dt=s.cityClock;s.cityClock=0;
            foreach(var c in s.cities){
                c.food=Mathf.Clamp(c.food-dt*.008f,0,120);c.water=Mathf.Clamp(c.water-dt*.004f,0,120);
                float welfare=(c.food+c.water+c.power+c.security)*.25f;c.health=Mathf.MoveTowards(c.health,welfare,dt*.007f);c.prosperity=Mathf.MoveTowards(c.prosperity,(c.health+c.security)*.5f,dt*.002f);
                if(s.time>=c.nextIncident){c.days++;c.nextIncident=s.time+720+(c.days*97+c.id.Length*31)%480;int incident=c.days%4;
                    if(incident==0)c.food=Mathf.Max(8,c.food-16);else if(incident==1)c.power=Mathf.Max(20,c.power-22);else if(incident==2){c.security=Mathf.Max(25,c.security-12);c.crime++;}else c.water=Mathf.Max(15,c.water-18);
                }
                if(c.power<78)Offer(save,c,"repair","District bus fault","The workshops are losing power. Bring two repair components to the utility station, then reconnect the district bus.","spares",2,160,true);
                if(c.food<68)Offer(save,c,"food","Canteen supplies running low","Deliver four food crates from your ship to the local receiving dock. Unload them before collecting payment.","organics",4,210,c.food<30);
                if(c.water<70)Offer(save,c,"water","Waterworks filter replacement","The water plant is reducing its output. Fit three alloy filters at the utility station.","alloy",3,140,true);
                if(c.security<78)Offer(save,c,"patrol","Inspect the outer service route","Walk the dock, market and outer utility checkpoints. Port control needs a verified report from each location.","",3,190,false);
                if(c.days%3==1)Offer(save,c,"survey","Assay the regional geology","Collect a field sample at the survey grove and deliver it to the research clinic.","sample",1,180,false);
                if(c.health<65)Offer(save,c,"medical","Clinic equipment shortage","The clinic needs two service components. Bring them to the medical district.","spares",2,175,true);
                if(c.days%4==2)Offer(save,c,"courier","A misrouted shipping ledger","Collect the signed ledger from the freight office and carry it to the market exchange.","",1,120,false);
            }
            foreach(var job in s.jobs){if((job.status=="accepted"||job.status=="offered")&&s.time>job.deadline){job.status="expired";job.outcome="The requester reassigned the job after its deadline.";}}
            if(s.jobs.Count>700)s.jobs.RemoveAll(j=>(j.status=="expired"||j.status=="completed")&&s.time-j.created>3600);
        }
        static void Offer(SaveData save,CitySociety city,string kind,string title,string brief,string good,int units,int reward,bool urgent)
        {
            var s=save.society;if(s.jobs.Exists(j=>j.city==city.id&&j.kind==kind&&(j.status=="offered"||j.status=="accepted")))return;
            var issuer=s.residents.Find(r=>r.homeCity==city.id&&r.job==(kind=="repair"||kind=="water"?"Port engineer":kind=="medical"?"Medic":"Merchant"));
            s.jobs.Add(new SocietyJob{id="society-"+(++s.sequence),city=city.id,world=city.world,issuer=issuer?.id??city.id,title=title,brief=brief,kind=kind,good=good,units=units,reward=reward,urgent=urgent,created=s.time,deadline=s.time+2400});
        }
        public static bool Accept(SaveData save,SocietyJob job){if(job==null||job.status!="offered"||save.society.time>job.deadline)return false;job.status="accepted";return true;}
        public static bool Complete(SaveData save,SocietyJob job,string city,int node,bool busRepaired=false)
        {
            if(job==null||job.status!="accepted"||job.city!=city||save.society.time>job.deadline)return false;
            if(job.kind=="courier"){if(job.stage==0&&node==1){job.stage=1;return false;}if(job.stage!=1||node!=3)return false;}
            else if(job.kind=="patrol"){int expected=job.stage==0?0:job.stage==1?3:2;if(node!=expected)return false;job.stage++;if(job.stage<3)return false;}
            else if(job.kind=="food"){if(node!=1||CargoHandling.Staged(save,save.world,"organics")<job.units)return false;CargoHandling.Stage(save,save.world,"organics",-job.units);}
            else if(job.kind=="repair"){if(node!=2||!busRepaired||save.vessel.spares<job.units)return false;save.vessel.spares-=job.units;}
            else if(job.kind=="water"){if(node!=2||save.inventory.alloy<job.units)return false;save.inventory.alloy-=job.units;}
            else if(job.kind=="medical"){if(node!=4||save.vessel.spares<job.units)return false;save.vessel.spares-=job.units;}
            else if(job.kind=="survey"){if(node!=4||save.inventory.samples<1)return false;save.inventory.samples--;}
            else return false;
            var c=City(save,city);if(job.kind=="food"){c.food=Mathf.Min(120,c.food+32);c.deliveries++;}if(job.kind=="repair"){c.power=100;c.repairs++;}if(job.kind=="water")c.water=Mathf.Min(120,c.water+30);if(job.kind=="medical")c.health=Mathf.Min(100,c.health+20);if(job.kind=="patrol")c.security=Mathf.Min(100,c.security+18);
            job.status="completed";job.outcome="Completed locally. District services and requester records updated.";save.credits+=job.reward;
            if(c.owner=="union")save.union+=3;else if(c.owner=="helix")save.helix+=3;else save.redwake+=3;
            var person=save.society.residents.Find(r=>r.id==job.issuer);if(person!=null)person.friendship+=2;
            return true;
        }
        public static void Work(SaveData save,Resident r)
        {
            var c=City(save,r.city);if(c==null)return;
            if(r.job=="Farmer")c.food=Mathf.Min(120,c.food+2);
            if(r.job=="Port engineer")c.power=Mathf.Min(100,c.power+.3f);
            if(r.job=="Medic"&&c.power>30&&c.water>15)c.health=Mathf.Min(100,c.health+.4f);
            if(r.job=="Patrol pilot")c.security=Mathf.Min(100,c.security+1);
            if(r.job=="Dockworker")c.prosperity=Mathf.Min(100,c.prosperity+.15f);
        }
        public static void Remember(SaveData save,Resident a,Resident b)
        {
            string first=string.CompareOrdinal(a.id,b.id)<0?a.id:b.id,last=first==a.id?b.id:a.id;
            var bond=save.society.bonds.Find(x=>x.a==first&&x.b==last);if(bond==null){bond=new SocialBond{a=first,b=last};save.society.bonds.Add(bond);}bond.meetings++;bond.trust=Math.Min(100,bond.trust+1);
        }
    }
}

