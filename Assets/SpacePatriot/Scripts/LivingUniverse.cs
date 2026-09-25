using System;
using System.Collections.Generic;
using UnityEngine;
namespace SpacePatriot
{
    [Serializable] public class Resident
    {
        public string id,name,job,home,world,destination,activity="Off shift",partner="",shipId="";
        public string city="",homeCity="",faction="union",person="";public int homeNode=5,workNode=1;public bool contractRequested,contractPaid;
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
                    string from=r.world;r.world=r.destination;r.city=r.world==r.home?r.homeCity:SocietyEconomy.Primary(r.world);r.deliveries++;r.credits+=r.job=="Freight pilot"?45:24;
                    var market=save.economy.markets.Find(m=>m.id==r.world);if(r.job=="Freight pilot"&&market!=null){market.Add("organics",6);market.activity++;}
                    News(s,r.name+" arrived at "+r.world+" aboard "+r.shipId+(r.job=="Freight pilot"?" with six food crates.":" after a "+r.job.ToLowerInvariant()+" sortie."));
                    r.activity="Dock service";r.fromNode=0;r.toNode=1;r.depart=s.time;r.until=s.time+55;continue;
                }
                if(r.activity=="Resting")r.fatigue=Mathf.Max(0,r.fatigue-60);
                if(r.activity=="Meal break"){r.hunger=Mathf.Max(0,r.hunger-65);r.credits=Math.Max(0,r.credits-6);}
                if(r.activity=="Working"){
                    r.credits+=12;r.visits++;SocietyEconomy.Work(save,r);var m=save.economy.markets.Find(x=>x.id==r.world);if(m!=null){if(r.job=="Farmer")m.Add("organics",3);if(r.job=="Dockworker")m.activity++;if(r.job=="Port engineer")m.Add("ore",-Mathf.Min(1,m.ore));}
                }
                r.fromNode=r.toNode;r.depart=s.time;r.partner="";r.visits++;
                if(r.hunger>65){r.activity="Meal break";r.toNode=3;r.until=s.time+80;}
                else if(r.fatigue>72){r.activity="Resting";r.toNode=5;r.until=s.time+180;}
                else if((int)(s.time/600)%3!=r.shift&&r.visits%3==0){r.activity="Resting";r.toNode=5;r.until=s.time+180;}
                else if(Pilot(r)){
                    int current=Array.FindIndex(worlds,w=>w.id==r.world);int dest=(current+1+(r.visits%Math.Max(1,worlds.Length-1)))%worlds.Length;
                    if(r.job=="Freight pilot"){
                        var from=save.economy.markets.Find(m=>m.id==r.world);if(from==null||from.organics<8){r.activity="Awaiting freight";r.toNode=1;r.until=s.time+35;continue;}from.Add("organics",-6);
                        float lowest=float.MaxValue;for(int i=0;i<worlds.Length;i++){var m=save.economy.markets.Find(x=>x.id==worlds[i].id);if(i!=current&&m.organics<lowest){lowest=m.organics;dest=i;}}
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
    public sealed class ResidentActor : MonoBehaviour
    {
        public Resident data;public Transform[] limbs;public Vector3 previous;
        public void Pose(float speed){float phase=Time.time*7+data.shift;foreach(var bone in limbs){float sign=bone.name.EndsWith("-1")?-1:1;bone.localRotation=Quaternion.Euler(Mathf.Sin(phase+(sign>0?Mathf.PI:0))*Mathf.Min(30,speed*20)*(bone.name.StartsWith("Arm")?-.55f:1),0,0);}if(speed<.1f&&data.partner!="")foreach(var bone in limbs)if(bone.name.StartsWith("Arm"))bone.localRotation=Quaternion.Euler(-25+Mathf.Sin(Time.time*2)*10,0,12);}
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
            foreach(var item in traffic){var r=save.society.residents.Find(n=>n.id==item.Key);float t=(float)((save.society.time-r.depart)/Math.Max(1,r.until-r.depart));bool flight=r.activity=="In transit";var tr=item.Value;
                tr.gameObject.SetActive(flight&&(r.city==save.settlement&&t<.38f||r.destination==CurrentWorld.id&&save.settlement==SocietyEconomy.Primary(CurrentWorld.id)&&t>.64f));if(!tr.gameObject.activeSelf)continue;
                bool outgoing=r.world==CurrentWorld.id&&t<.5f;float local=outgoing?Mathf.Clamp01(t/.36f):Mathf.Clamp01((1-t)/.36f);var berth=Stop(0)+new Vector3((r.shift-1)*48,ShipSpec.Fleet[r.ship].height*.3f+4,90+r.shift*55);
                var target=berth+new Vector3(600*local,160*local+Mathf.Sin(local*Mathf.PI)*70,1800*local*local);Vector3 direction=target-tr.position;if(direction.sqrMagnitude>1)tr.rotation=Quaternion.Slerp(tr.rotation,Quaternion.LookRotation(direction),dt*1.2f);tr.position=target;
            }
        }
        static Vector3 Route(Vector3 a,Vector3 b,Vector3 c,Vector3 d,float t){float ab=Vector3.Distance(a,b),bc=Vector3.Distance(b,c),cd=Vector3.Distance(c,d),n=t*(ab+bc+cd);if(n<ab)return Vector3.Lerp(a,b,n/Mathf.Max(.001f,ab));n-=ab;if(n<bc)return Vector3.Lerp(b,c,n/Mathf.Max(.001f,bc));return Vector3.Lerp(c,d,(n-bc)/Mathf.Max(.001f,cd));}
        void SyncResidents()
        {
            foreach(var r in save.society.residents){if(r.city!=save.settlement&&r.destination!=CurrentWorld.id)continue;
                if(r.city==save.settlement&&!people.ContainsKey(r.id)&&people.Count<48){var prefab=Resources.Load<GameObject>("OriginalShips/citizen-"+(r.shift%3));if(prefab==null)continue;var go=Instantiate(prefab,populationRoot);go.name=r.name+" / "+r.job;go.transform.position=Stop(r.fromNode,r.shift);var a=go.AddComponent<ResidentActor>();a.data=r;var bones=new List<Transform>();foreach(var tr in go.GetComponentsInChildren<Transform>())if(tr.name.StartsWith("Arm ")||tr.name.StartsWith("Leg "))bones.Add(tr);a.limbs=bones.ToArray();people.Add(r.id,a);}
                if(LivingUniverse.Pilot(r)&&!traffic.ContainsKey(r.id)&&traffic.Count<10){var prefab=Resources.Load<GameObject>("OriginalShips/refit-"+ShipSpec.Fleet[r.ship].family);var go=Instantiate(prefab,populationRoot);go.name=r.name+" / "+r.shipId;go.transform.position=Stop(0)+Vector3.up*10;traffic.Add(r.id,go.transform);}
            }
            var stale=new List<string>();foreach(var pair in people)if(pair.Value.data.city!=save.settlement){Destroy(pair.Value.gameObject);stale.Add(pair.Key);}foreach(var id in stale)people.Remove(id);
            stale.Clear();foreach(var pair in traffic){var r=save.society.residents.Find(n=>n.id==pair.Key);if(r.world!=CurrentWorld.id&&r.destination!=CurrentWorld.id){Destroy(pair.Value.gameObject);stale.Add(pair.Key);}}foreach(var id in stale)traffic.Remove(id);
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
