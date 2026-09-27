using System;
using System.Collections.Generic;
using UnityEngine;
namespace SpacePatriot
{
    [Serializable] public class Resident
    {
        public string id,name,job,home,world,destination,activity="Off shift",partner="",shipId="";
        public string city="",homeCity="",faction="union",person="";public int homeNode=5,workNode=1;public bool contractRequested,contractPaid;
        // A freight manifest survives unloading a sector and a save/reload. The
        // destination market changes only after the dock-service phase finishes.
        public string cargoGood="",cargoJobId="",cargoCity="";public int cargoUnits;
        public int ship,shift,visits,deliveries,credits=120,friendship;
        public double until,depart;
        public float hunger=15,fatigue=10;
        public int fromNode,toNode;
    }
    [Serializable] public class SocietyState
    {
        public double time;public long savedUtc;public int sequence,version;public float cityClock;
        public List<CitySociety> cities=new();public List<SocialBond> bonds=new();public List<SocietyJob> jobs=new();
        public List<Resident> residents=new List<Resident>();public List<string> events=new List<string>();
    }
    // Authoritative simulation is independent of instantiated actors and current world.
    // Visual actors only interpolate the persisted itinerary; unloading a sector cannot stop its economy.
    public static class LivingUniverse
    {
        static readonly string[] First={"Ivo","Mara","Sana","Dane","Tomas","Ari","Imani","Rin","Leah","Oren","Niko","Edda"};
        static readonly string[] Last={"Vale","Rook","Mercer","Okafor","Chen","Alvarez","Sato","Bell","Navarro","Hale","Singh","Ward"};
        static readonly string[] Jobs={"Freight pilot","Port engineer","Survey pilot","Dockworker","Patrol pilot","Merchant","Medic","Farmer"};
        public static bool Pilot(Resident r)=>r.shipId!="";
        public static void Ensure(SaveData save,WorldInfo[] worlds)
        {
            save.society??=new SocietyState();var s=save.society;s.residents??=new List<Resident>();s.events??=new List<string>();
            if(s.residents.Count==0)for(int w=0;w<worlds.Length;w++)for(int k=0;k<32;k++){
                string job=Jobs[k%8];bool pilot=job.Contains("pilot");
                s.residents.Add(new Resident{id=worlds[w].id+"-resident-"+k,name=First[(k+w)%12]+" "+Last[(k*5+w*3)%12],home=worlds[w].id,world=worlds[w].id,job=job,shift=k%3,shipId=pilot?worlds[w].id+"-vessel-"+k:"",ship=(k==0?(w%5==0?90:70):k%8==0?20:k%8==2?40:10)+k%10,fromNode=k%6,toNode=(k+1)%6,until=5+k*2+w,depart=0});
            }
            SocietyEconomy.Ensure(save,worlds);
            // Bounded offline advancement. The same step function handles loaded and absent sectors.
            long now=DateTimeOffset.UtcNow.ToUnixTimeSeconds();if(s.savedUtc>0){double seconds=Math.Min(6*3600,Math.Max(0,now-s.savedUtc));for(double t=0;t<seconds;t+=30)Step(save,worlds,(float)Math.Min(30,seconds-t));}s.savedUtc=now;
        }
        static void News(SocietyState s,string message){s.events.Add(message);while(s.events.Count>48)s.events.RemoveAt(0);}
        public static void Step(SaveData save,WorldInfo[] worlds,float dt)
        {
            if(dt<=0||float.IsNaN(dt)||float.IsInfinity(dt))return;var s=save.society;s.time+=dt;SocietyEconomy.Advance(save,dt);
            foreach(var r in s.residents){r.hunger=Mathf.Clamp(r.hunger+dt*.022f,0,100);r.fatigue=Mathf.Clamp(r.fatigue+dt*.015f,0,100);if(s.time<r.until)continue;
                if(r.activity=="In transit"){
                    string from=r.world;r.world=r.destination;r.city=r.job=="Freight pilot"&&!string.IsNullOrEmpty(r.cargoCity)?r.cargoCity:r.world==r.home?r.homeCity:SocietyEconomy.Primary(r.world);
                    if(r.job!="Freight pilot"){r.deliveries++;r.credits+=24;}
                    else if(r.cargoUnits==0){r.cargoGood="organics";r.cargoUnits=FreightLogistics.LoadSize;} // Older saves already debited the source market.
                    News(s,r.name+" arrived at "+r.world+" aboard "+r.shipId+(r.job=="Freight pilot"?" carrying a counted freight manifest.":" after a "+r.job.ToLowerInvariant()+" sortie."));
                    r.activity="Dock service";r.fromNode=0;r.toNode=1;r.depart=s.time;r.until=s.time+FreightLogistics.DockSeconds;continue;
                }
                if(r.activity=="Dock service"&&r.job=="Freight pilot"&&r.cargoUnits>0){
                    string job=FreightLogistics.Unload(save,r);
                    News(s,r.name+" unloaded "+FreightLogistics.LoadSize+" food crates at "+r.city+(job!=""?" for "+job+".":"."));
                    r.activity="Port turnaround";r.fromNode=1;r.toNode=0;r.depart=s.time;r.until=s.time+20;continue;
                }
                if(r.activity=="Resting")r.fatigue=Mathf.Max(0,r.fatigue-60);
                if(r.activity=="Meal break"){r.hunger=Mathf.Max(0,r.hunger-65);r.credits=Math.Max(0,r.credits-6);}
                if(r.activity=="Working"){
                    r.credits+=12;r.visits++;SocietyEconomy.Work(save,r);var m=save.economy.markets.Find(x=>x.id==r.world);if(m!=null){if(r.job=="Farmer")m.Add("organics",3);if(r.job=="Dockworker")m.activity++;if(r.job=="Port engineer")m.Add("ore",-Mathf.Min(1,m.ore));}
                }
                bool clearingBerth=r.activity=="Port turnaround"&&r.job=="Freight pilot";
                r.fromNode=r.toNode;r.depart=s.time;r.partner="";r.visits++;
                if(!clearingBerth&&r.hunger>65){r.activity="Meal break";r.toNode=3;r.until=s.time+80;}
                else if(!clearingBerth&&r.fatigue>72){r.activity="Resting";r.toNode=5;r.until=s.time+180;}
                else if(!clearingBerth&&(int)(s.time/600)%3!=r.shift&&r.visits%3==0){r.activity="Resting";r.toNode=5;r.until=s.time+180;}
                else if(Pilot(r)){
                    int current=Array.FindIndex(worlds,w=>w.id==r.world);int dest=(current+1+(r.visits%Math.Max(1,worlds.Length-1)))%worlds.Length;
                    if(r.job=="Freight pilot"){
                        var from=save.economy.markets.Find(m=>m.id==r.world);if(from==null||from.organics<8){r.activity="Awaiting freight";r.toNode=1;r.until=s.time+35;continue;}
                        dest=FreightLogistics.Assign(save,worlds,r,current,dest);from.Add("organics",-FreightLogistics.LoadSize);
                    }
                    if(r.job=="Patrol pilot"&&r.visits%3!=0)dest=current;
                    r.destination=worlds[dest].id;r.activity="In transit";r.toNode=0;r.until=s.time+150+(r.visits%5)*30;
                }else if(r.visits%4==0){
                    r.activity="Social break";r.toNode=3;r.until=s.time+60;
                    var friend=s.residents.Find(p=>p.id!=r.id&&p.city==r.city&&p.activity=="Social break");
                    if(friend!=null){r.partner=friend.name;friend.partner=r.name;r.friendship++;friend.friendship++;SocietyEconomy.Remember(save,r,friend);News(s,r.name+" and "+friend.name+" met at the port canteen.");}
                }else{r.activity="Working";r.toNode=r.job=="Port engineer"?2:r.job=="Merchant"?3:r.job=="Medic"?4:r.job=="Farmer"?6:1;r.until=s.time+90+(r.visits%4)*20;}
                if(r.activity!="In transit")r.until+=CityRoutes.Distance(r.fromNode,r.toNode)/1.6f;
            }
        }
    }
    public static class FreightLogistics
    {
        public const int LoadSize=6;
        public const float DockSeconds=55;
        public const float ApproachFraction=.36f;

        // Reserve an offered food job before loading. Accepted player jobs are
        // never commandeered by an NPC, and a second pilot cannot reserve it.
        public static int Assign(SaveData save,WorldInfo[] worlds,Resident pilot,int current,int fallback)
        {
            SocietyJob chosen=null;float priority=float.MinValue;
            var reserved=new HashSet<string>();
            var cities=new Dictionary<string,CitySociety>(save.society.cities.Count);
            foreach(var city in save.society.cities)cities[city.id]=city;
            foreach(var resident in save.society.residents)
                if(resident!=pilot&&resident.cargoUnits>0&&!string.IsNullOrEmpty(resident.cargoJobId))reserved.Add(resident.cargoJobId);
            foreach(var job in save.society.jobs)
            {
                if(job.kind!="food"||job.good!="organics"||job.status!="offered"||
                   job.world==pilot.world||job.deadline<=save.society.time+360||job.units>LoadSize||
                   reserved.Contains(job.id))continue;
                if(!cities.TryGetValue(job.city,out var city))continue;
                float score=(job.city==save.settlement?1000:0)+(job.urgent?100:0)-city.food;
                if(score<=priority)continue;priority=score;chosen=job;
            }
            int destination=fallback;
            if(chosen!=null)
            {
                destination=Array.FindIndex(worlds,w=>w.id==chosen.world);
                if(destination<0)chosen=null;
            }
            if(chosen==null)
            {
                float lowest=float.MaxValue;
                for(int i=0;i<worlds.Length;i++)
                {
                    var market=save.economy.markets.Find(m=>m.id==worlds[i].id);
                    if(i==current||market==null||market.organics>=lowest)continue;
                    lowest=market.organics;destination=i;
                }
            }
            pilot.cargoGood="organics";pilot.cargoUnits=LoadSize;
            pilot.cargoJobId=chosen?.id??"";
            pilot.cargoCity=chosen?.city??SocietyEconomy.Primary(worlds[destination].id);
            return destination;
        }

        // Returns the completed job title, if this counted load fulfilled one.
        public static string Unload(SaveData save,Resident pilot)
        {
            if(pilot.cargoUnits<=0||pilot.cargoGood!="organics")return "";
            int units=pilot.cargoUnits;
            var market=save.economy.markets.Find(m=>m.id==pilot.world);
            if(market==null)return "";
            market.Add("organics",units);market.activity++;
            string completed="";
            var job=save.society.jobs.Find(j=>j.id==pilot.cargoJobId);
            if(job!=null&&job.status=="offered"&&job.kind=="food"&&job.good=="organics"&&
               job.world==pilot.world&&job.city==pilot.city&&job.units<=units&&
               save.society.time<=job.deadline)
            {
                var city=SocietyEconomy.City(save,job.city);
                if(city!=null)
                {
                    city.food=Mathf.Min(120,city.food+32);city.deliveries++;
                    job.status="completed";job.outcome="Fulfilled by "+pilot.name+" aboard "+pilot.shipId+"; six food crates were unloaded at the port.";
                    completed=job.title;
                }
            }
            pilot.deliveries++;pilot.credits+=45;
            pilot.cargoGood=pilot.cargoJobId=pilot.cargoCity="";pilot.cargoUnits=0;
            return completed;
        }

        public static float Progress(Resident pilot,double now)
            =>Mathf.Clamp01((float)((now-pilot.depart)/Math.Max(1,pilot.until-pilot.depart)));

        public static bool Visible(Resident pilot,string worldId,string cityId,double now)
        {
            if(pilot.activity=="Dock service"||pilot.activity=="Port turnaround")return pilot.job=="Freight pilot"&&pilot.world==worldId&&pilot.city==cityId;
            if(pilot.activity!="In transit")return false;
            float t=Progress(pilot,now);
            return (pilot.world==worldId&&pilot.city==cityId&&t<ApproachFraction+.02f) ||
                (pilot.destination==worldId&&
                (pilot.job=="Freight pilot"&&!string.IsNullOrEmpty(pilot.cargoCity)?pilot.cargoCity:SocietyEconomy.Primary(worldId))==cityId&&
                t>1-ApproachFraction-.02f);
        }

        public static Vector3 Berth(Place capitalQuay,float standHeight)
            =>capitalQuay.position+new Vector3(150,standHeight-2.65f,0);

        // The freight itinerary belongs to the resident, but the visible berth
        // belongs to the active port. Port 07 has a clear outer slab east of the
        // hangar; the city quay has two bays so a parked player never shares one.
        public static bool TryBerth(FrontierWorld world,ShipSpec freight,
            Vector3 playerPosition,Quaternion playerRotation,ShipSpec playerShip,bool playerLanded,
            out Vector3 center,out bool besidePlayer)
        {
            center=default;besidePlayer=false;
            var nearest=playerLanded?world.Nearest(playerPosition,"landing"):null;
            bool atPort07=nearest!=null&&(nearest.name=="Port 07 landing pad"||nearest.name=="Capital ship apron");
            bool atStation=nearest!=null&&nearest.name=="Traffic station landing pad";
            if(atPort07&&TryCandidate(world,freight,new Vector3(335,world.Deck+2.65f,-120),
                playerPosition,playerRotation,playerShip,playerLanded,out center))
            {besidePlayer=true;return true;}
            if(atStation)
            {
                if(TryCandidate(world,freight,world.station+new Vector3(220,2.65f,-3),
                    playerPosition,playerRotation,playerShip,playerLanded,out center))
                {besidePlayer=true;return true;}
                if(TryCandidate(world,freight,world.station+new Vector3(-220,2.65f,-3),
                    playerPosition,playerRotation,playerShip,playerLanded,out center))
                {besidePlayer=true;return true;}
            }
            if(TryCandidate(world,freight,new Vector3(800,world.Deck+2.65f,230),
                playerPosition,playerRotation,playerShip,playerLanded,out center))
            {besidePlayer=nearest!=null&&nearest.name=="Capital ship quay";return true;}
            if(TryCandidate(world,freight,new Vector3(580,world.Deck+2.65f,230),
                playerPosition,playerRotation,playerShip,playerLanded,out center))
            {besidePlayer=nearest!=null&&nearest.name=="Capital ship quay";return true;}
            return false;
        }

        static bool TryCandidate(FrontierWorld world,ShipSpec freight,Vector3 near,
            Vector3 playerPosition,Quaternion playerRotation,ShipSpec playerShip,bool playerLanded,
            out Vector3 center)
        {
                center=default;
                if(!world.TryLandingDeck(near,1,8,out var deck,out var normal,out _)||
                    !world.LandingFootprintFits(deck,Quaternion.identity,freight.width,freight.length))return false;
                // A supported floor is insufficient if the hull would be
                // embedded in a building or a cargo module beside the bay.
                Vector3 hullCenter=deck+normal*(freight.height*.5f+.35f);
                Vector3 hullExtents=new Vector3(freight.width*.5f+.75f,
                    Mathf.Max(.1f,freight.height*.5f-.35f),freight.length*.5f+.75f);
                foreach(var obstacle in Physics.OverlapBox(hullCenter,hullExtents,Quaternion.identity,
                    Physics.DefaultRaycastLayers,QueryTriggerInteraction.Ignore))
                    if(obstacle.transform.IsChildOf(world.transform)&&!world.IsWalkDeck(obstacle)&&
                       obstacle.bounds.max.y>deck.y+.6f)return false;
                if(playerLanded)
                {
                    // Project the player's rotated hull onto the port axes. A
                    // gear-only footprint is too small for a safe second berth.
                    Vector3 playerRight=playerRotation*Vector3.right*(playerShip.width*.5f);
                    Vector3 playerForward=playerRotation*Vector3.forward*(playerShip.length*.5f);
                    float playerX=Mathf.Abs(playerRight.x)+Mathf.Abs(playerForward.x);
                    float playerZ=Mathf.Abs(playerRight.z)+Mathf.Abs(playerForward.z);
                    if(Mathf.Abs(deck.x-playerPosition.x)<freight.width*.5f+playerX+8&&
                       Mathf.Abs(deck.z-playerPosition.z)<freight.length*.5f+playerZ+8&&
                       Mathf.Abs(deck.y-playerPosition.y)<freight.height+playerShip.height+8)return false;
                }
                center=deck+normal*(freight.height*.3f+2);
                return true;
        }

        public static Vector3 FlightPosition(Vector3 berth,float transitProgress,bool outgoing)
        {
            float local=outgoing?Mathf.Clamp01(transitProgress/ApproachFraction):
                Mathf.Clamp01((1-transitProgress)/ApproachFraction);
            float rise=local*local*(3-2*local);
            return berth+new Vector3(420*rise,180*rise+Mathf.Sin(rise*Mathf.PI)*55,920*rise);
        }
    }
    public sealed class ResidentActor : MonoBehaviour
    {
        public Resident data;public Transform[] limbs;public Vector3 previous;
        public void Pose(float speed){float phase=Time.time*7+data.shift;foreach(var bone in limbs){float sign=bone.name.EndsWith("-1")?-1:1;bone.localRotation=Quaternion.Euler(Mathf.Sin(phase+(sign>0?Mathf.PI:0))*Mathf.Min(30,speed*20)*(bone.name.StartsWith("Arm")?-.55f:1),0,0);}if(speed<.1f&&data.partner!="")foreach(var bone in limbs)if(bone.name.StartsWith("Arm"))bone.localRotation=Quaternion.Euler(-25+Mathf.Sin(Time.time*2)*10,0,12);}
    }
    public sealed class FreightShipActor : MonoBehaviour
    {
        readonly Transform[] crates=new Transform[FreightLogistics.LoadSize];
        Transform ramp;float width,standHeight;
        public Vector3 berth;
        public void Initialize(ShipSpec spec)
        {
            width=spec.width;standHeight=spec.height*.3f+2;
            float hatch=-width*.42f,dock=-width*.5f-5;
            ramp=IndustrialArt.Box("Freight access ramp",transform,
                new Vector3((hatch+dock)*.5f,-standHeight+.16f,0),
                new Vector3(hatch-dock,.12f,4),IndustrialArt.Steel).transform;
            for(int i=0;i<crates.Length;i++)
            {
                var crate=IndustrialArt.Root("Manifest crate "+(i+1),transform);
                IndustrialArt.Crate(crate,Vector3.zero,1);
                foreach(var collider in crate.GetComponentsInChildren<Collider>())collider.enabled=false;
                crates[i]=crate;
            }
            HideCargo();
        }
        public void HideCargo()
        {
            if(ramp)ramp.gameObject.SetActive(false);
            foreach(var crate in crates)if(crate)crate.gameObject.SetActive(false);
        }
        public void PoseCargo(float progress)
        {
            if(ramp)ramp.gameObject.SetActive(true);
            for(int i=0;i<crates.Length;i++)
            {
                float start=.08f+i*.125f;
                float travel=Mathf.Clamp01((progress-start)/.14f);
                crates[i].gameObject.SetActive(progress>=start);
                Vector3 hold=new Vector3(-width*.42f,-standHeight+1.2f,-3+i*1.15f);
                Vector3 dock=new Vector3(-width*.5f-5,-standHeight+.08f,(i%3-1)*3+(i/3)*2);
                crates[i].localPosition=Vector3.Lerp(hold,dock,travel);
            }
        }
    }
    public partial class FrontierGame
    {
        Transform populationRoot;readonly Dictionary<string,ResidentActor> people=new();readonly Dictionary<string,Transform> traffic=new();float societyAccumulator,trafficRefresh;string populationWorld="";Resident speaking;
        static readonly Vector2[] Stops=CityRoutes.Stops;
        Vector3 Stop(int index,int variation=0){var p=Stops[index%Stops.Length];return new Vector3(p.x+(variation%3-1)*1.3f,world.Deck,p.y+(variation/3%3-1)*1.3f);}
        void TickSociety(float dt)
        {
            if(!started)return;societyAccumulator+=dt;
            if(societyAccumulator>=1){LivingUniverse.Step(save,worlds,societyAccumulator);societyAccumulator=0;}
            if(populationWorld!=save.settlement){if(populationRoot)Destroy(populationRoot.gameObject);people.Clear();traffic.Clear();populationRoot=new GameObject("Residents and owned vessels / "+CurrentWorld.name).transform;populationRoot.SetParent(transform);populationWorld=save.settlement;trafficRefresh=0;}
            trafficRefresh-=dt;if(trafficRefresh<=0){trafficRefresh=3;SyncResidents();}
            foreach(var actor in people.Values){var r=actor.data;bool visible=r.city==save.settlement&&r.activity!="In transit";visible=visible&&Vector3.Distance(view.transform.position,actor.transform.position)<550;actor.gameObject.SetActive(visible);if(!visible)continue;
                Vector3 from=Stop(r.fromNode,r.shift),to=Stop(r.toNode,r.shift);float distance=CityRoutes.Distance(r.fromNode,r.toNode);float t=Mathf.Clamp01((float)(save.society.time-r.depart)*1.6f/Mathf.Max(1,distance));
                // Use the apron perimeter and clear cross-streets, not straight lines through buildings.
                Vector3 via=new Vector3(CityRoutes.Spine,world.Deck,from.z),via2=new Vector3(CityRoutes.Spine,world.Deck,to.z);Vector3 desired=Route(from,via,via2,to,t);
                Vector3 delta=desired-actor.transform.position;float speed=delta.magnitude/Mathf.Max(.001f,dt);actor.transform.position=Vector3.MoveTowards(actor.transform.position,desired,dt*2);
                if(delta.sqrMagnitude>.002f)actor.transform.rotation=Quaternion.Slerp(actor.transform.rotation,Quaternion.LookRotation(delta.normalized),dt*7);actor.Pose(Mathf.Min(2,speed));
            }
            foreach(var item in traffic){var r=save.society.residents.Find(n=>n.id==item.Key);if(r==null)continue;float t=FreightLogistics.Progress(r,save.society.time);var tr=item.Value;
                bool visible=FreightLogistics.Visible(r,CurrentWorld.id,save.settlement,save.society.time);tr.gameObject.SetActive(visible);if(!visible)continue;
                bool outgoing=r.world==CurrentWorld.id&&t<.5f;
                if(r.job=="Freight pilot")
                {
                    var freight=tr.GetComponent<FreightShipActor>();if(freight==null)continue;
                    var berth=freight.berth;
                    bool service=r.activity=="Dock service"||r.activity=="Port turnaround";
                    var target=service?berth:FreightLogistics.FlightPosition(berth,t,outgoing);
                    Vector3 direction=target-tr.position;
                    if(service)tr.rotation=Quaternion.Slerp(tr.rotation,Quaternion.identity,dt*4);
                    else if(direction.sqrMagnitude>1){var heading=Vector3.ProjectOnPlane(direction,Vector3.up);if(heading.sqrMagnitude>1)tr.rotation=Quaternion.Slerp(tr.rotation,Quaternion.LookRotation(heading,Vector3.up),dt*2);}
                    tr.position=target;
                    if(r.activity=="Dock service"&&r.cargoUnits>0)freight.PoseCargo(t);else if(r.activity=="Port turnaround")freight.PoseCargo(1);else freight.HideCargo();
                }
                else
                {
                    float local=outgoing?Mathf.Clamp01(t/.36f):Mathf.Clamp01((1-t)/.36f);
                    var berth=Stop(0)+new Vector3((r.shift-1)*48,ShipSpec.Fleet[r.ship].height*.3f+4,90+r.shift*55);
                    var target=berth+new Vector3(600*local,160*local+Mathf.Sin(local*Mathf.PI)*70,1800*local*local);
                    Vector3 direction=target-tr.position;if(direction.sqrMagnitude>1)tr.rotation=Quaternion.Slerp(tr.rotation,Quaternion.LookRotation(direction),dt*1.2f);tr.position=target;
                }
            }
        }
        static Vector3 Route(Vector3 a,Vector3 b,Vector3 c,Vector3 d,float t){float ab=Vector3.Distance(a,b),bc=Vector3.Distance(b,c),cd=Vector3.Distance(c,d),n=t*(ab+bc+cd);if(n<ab)return Vector3.Lerp(a,b,n/Mathf.Max(.001f,ab));n-=ab;if(n<bc)return Vector3.Lerp(b,c,n/Mathf.Max(.001f,bc));return Vector3.Lerp(c,d,(n-bc)/Mathf.Max(.001f,cd));}
        void SyncResidents()
        {
            Resident featuredFreight=null;int featuredScore=int.MinValue;Vector3 featuredBerth=default;
            foreach(var r in save.society.residents)
            {
                if(r.job!="Freight pilot"||!FreightLogistics.Visible(r,CurrentWorld.id,save.settlement,save.society.time))continue;
                bool existing=traffic.TryGetValue(r.id,out var existingVessel);
                var existingActor=existing?existingVessel.GetComponent<FreightShipActor>():null;
                bool local;
                Vector3 berth;
                if(existingActor!=null){berth=existingActor.berth;local=Vector3.Distance(berth,ship.position)<450;}
                else if(!FreightLogistics.TryBerth(world,ShipSpec.Fleet[r.ship],ship.position,ship.rotation,
                    Spec,!flying,out berth,out local))continue;
                int score=(r.cargoJobId!=""&&r.cargoCity==save.settlement?100:0)+
                    (r.activity=="Dock service"?30:r.activity=="Port turnaround"?20:r.world!=CurrentWorld.id?10:0)+
                    (local?200:0)+(existing?5:0);
                if(score<=featuredScore)continue;featuredFreight=r;featuredScore=score;featuredBerth=berth;
            }
            var stale=new List<string>();foreach(var pair in people)if(pair.Value.data.city!=save.settlement){Destroy(pair.Value.gameObject);stale.Add(pair.Key);}foreach(var id in stale)people.Remove(id);
            foreach(var r in save.society.residents){if(r.city!=save.settlement||people.ContainsKey(r.id)||people.Count>=48)continue;
                var prefab=Resources.Load<GameObject>("OriginalShips/citizen-"+(r.shift%3));if(prefab==null)continue;var go=Instantiate(prefab,populationRoot);go.name=r.name+" / "+r.job;go.transform.position=Stop(r.fromNode,r.shift);var a=go.AddComponent<ResidentActor>();a.data=r;var bones=new List<Transform>();foreach(var tr in go.GetComponentsInChildren<Transform>())if(tr.name.StartsWith("Arm ")||tr.name.StartsWith("Leg "))bones.Add(tr);a.limbs=bones.ToArray();people.Add(r.id,a);
            }
            stale.Clear();foreach(var pair in traffic){var r=save.society.residents.Find(n=>n.id==pair.Key);if(r==null||!FreightLogistics.Visible(r,CurrentWorld.id,save.settlement,save.society.time)||r.job=="Freight pilot"&&r!=featuredFreight){Destroy(pair.Value.gameObject);stale.Add(pair.Key);}}foreach(var id in stale)traffic.Remove(id);
            // Fill visible berths with freight first. Dormant pilots never occupy
            // the ten-ship render budget and hide an actual delivery.
            for(int pass=0;pass<2;pass++)foreach(var r in save.society.residents)
            {
                if((pass==0)!=(r.job=="Freight pilot")||r.job=="Freight pilot"&&r!=featuredFreight||!LivingUniverse.Pilot(r)||traffic.ContainsKey(r.id)||traffic.Count>=10||
                   !FreightLogistics.Visible(r,CurrentWorld.id,save.settlement,save.society.time))continue;
                var spec=ShipSpec.Fleet[r.ship];var prefab=Resources.Load<GameObject>("OriginalShips/refit-"+spec.family);if(prefab==null)continue;
                var vessel=new GameObject(r.name+" / "+r.shipId+(r.job=="Freight pilot"?" / active freight route":" / owned flight")).transform;vessel.SetParent(populationRoot,false);
                var hull=Instantiate(prefab,vessel).transform;hull.localPosition=Vector3.zero;hull.localRotation=Quaternion.identity;
                var basis=ShipSpec.Fleet[spec.family*10];hull.localScale=new Vector3(spec.width/basis.width,spec.height/basis.height,spec.length/basis.length);
                var renderers=hull.GetComponentsInChildren<MeshRenderer>();if(renderers.Length>0){var bounds=renderers[0].bounds;foreach(var renderer in renderers)bounds.Encapsulate(renderer.bounds);hull.localPosition=Vector3.up*(-(spec.height*.3f+2)-(bounds.min.y-vessel.position.y));}
                if(r.job=="Freight pilot")
                {var freight=vessel.gameObject.AddComponent<FreightShipActor>();freight.berth=featuredBerth;freight.Initialize(spec);}
                vessel.position=Stop(0)+Vector3.up*10;traffic.Add(r.id,vessel);
            }
        }
        bool SpeakToResident(){foreach(var a in people.Values)if(a.gameObject.activeSelf&&Vector3.Distance(walkPosition,a.transform.position+Vector3.up*1.5f)<3){speaking=a.data;page="population";menu=true;return true;}return false;}
        void PopulationPanel()
        {
            Text("SECTOR ACTIVITY / PERSISTENT RESIDENTS",400,231,900,30,17,amber,true);
            if(speaking!=null){Text(speaking.name+" / "+speaking.job,400,276,900,36,25,paper,true);Text(speaking.activity+(speaking.partner!=""?" with "+speaking.partner:"")+"\nHome: "+speaking.home+"   Completed jobs: "+speaking.deliveries+"\nVessel: "+(speaking.shipId==""?"Ground crew":speaking.shipId),400,329,900,109,19,muted);
                if(Button("ASK ABOUT WORK",400,455,330,42)){if(speaking.person!=""){speaking.contractRequested=true;Toast(SocietyConversation.Request(speaking.person));Save();}else{page="community";}}
                if(speaking.person!=""&&speaking.contractRequested&&Button(speaking.contractPaid?"CONTRACT FULFILLED":"DELIVER REQUESTED ITEMS",753,455,553,42,false,!speaking.contractPaid)){Toast(SocietyConversation.Deliver(save,speaking)?"Delivery accepted. Your supplies and faction standing have been updated.":"You do not have the requested supplies, or the reward would exceed inventory limits.");Save();}}
            else Text(save.society.residents.Count+" residents across "+worlds.Length+" worlds. Pilots own ships; jobs affect local supplies.",400,281,900,66,22,paper);
            int count=0;for(int i=save.society.events.Count-1;i>=0&&count<5;i--,count++)Text(save.society.events[i],400,511+count*42,906,40,15,muted);
            if(Button("BACK TO OPERATIONS",400,735,350,40)){speaking=null;page="overview";}
        }
    }
}
