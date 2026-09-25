using System;
using System.Collections.Generic;
using UnityEngine;
using static SpacePatriot.IndustrialArt;

namespace SpacePatriot
{
    [Serializable] public class DockCargo {public int world;public string settlement="",good;public int units;}
    public static class CargoHandling
    {
        static WorldInfo[] worldCatalog;
        static WorldInfo[] Worlds=>worldCatalog??=JsonUtility.FromJson<WorldCatalog>(Resources.Load<TextAsset>("Worlds").text).worlds;
        static string Dock(SaveData s,int world)
        {
            if(world==s.world&&!string.IsNullOrEmpty(s.settlement))return s.settlement;
            return SocietyEconomy.Primary(Worlds[world].id);
        }
        static DockCargo Row(SaveData s,int world,string good)
        {
            string dock=Dock(s,world);
            foreach(var old in s.dockCargo)if(string.IsNullOrEmpty(old.settlement))old.settlement=SocietyEconomy.Primary(Worlds[old.world].id);
            return s.dockCargo.Find(x=>x.world==world&&x.settlement==dock&&x.good==good);
        }
        public static int Staged(SaveData s,int world,string good)=>Row(s,world,good)?.units??0;
        public static void Stage(SaveData s,int world,string good,int delta)
        {var row=Row(s,world,good);if(row==null){row=new DockCargo{world=world,settlement=Dock(s,world),good=good};s.dockCargo.Add(row);}row.units=Mathf.Max(0,row.units+delta);}
        public static bool Transfer(SaveData s,int world,string good,int capacity,bool load)
        {
            if(good!="ore"&&good!="organics"&&good!="crystal")return false;
            if(load){if(Staged(s,world,good)<1||Progression.Used(s)>=capacity)return false;Stage(s,world,good,-1);Progression.AddCargo(s,good,1);}
            else{if(Progression.Cargo(s,good)<1)return false;Progression.AddCargo(s,good,-1);Stage(s,world,good,1);}return true;
        }
    }
    public partial class FrontierGame
    {
        public bool cargoDoor;
        Transform cargoRoot,cargoRamp,cargoVisuals,dockVisuals;
        class CargoMove {public string good;public bool load;public int world;public Transform crate;public Vector3 from,to;public float elapsed;}
        CargoMove cargoTransfer;
        public Vector3 CargoAccess=>ship.TransformPoint(new Vector3(-Spec.width*.53f,1.75f-StandHeight,-Spec.length*.12f));
        public bool AtCargoAccess=>AtPort&&(aboard||walking&&Vector3.Distance(walkPosition,CargoAccess)<14);
        public void RebuildCargo()
        {
            if(cargoVisuals!=null)Destroy(cargoVisuals.gameObject);
            cargoVisuals=Root("Cargo manifest / physical containers",ship);
            if(cargoRoot==null||cargoRoot.parent!=ship){cargoRoot=Root("Cargo service hatch",ship,new Vector3(-Spec.width*.4f,-StandHeight+.3f,-Spec.length*.12f));
                cargoRamp=Root("Cargo ramp",cargoRoot);Box("Freight access deck",cargoRamp,new Vector3(-1.3f,0,0),new Vector3(3.1f,.14f,2.4f),Steel);for(int i=-1;i<=1;i+=2)Box("Ramp hazard edge",cargoRamp,new Vector3(-1.3f,.09f,i*1.15f),new Vector3(3.1f,.05f,.12f),Orange);}
            cargoRamp.gameObject.SetActive(cargoDoor);
            string[] goods={"organics","ore","crystal"};int slot=0;
            foreach(var good in goods){int count=Progression.Cargo(save,good);for(int i=0;i<Mathf.Min(count,6);i++)
                {var crate=MakeCargoCrate(good,cargoVisuals);crate.localPosition=new Vector3(-Spec.width*.34f+(slot%3)*1.15f,-StandHeight+1.0f,-Spec.length*.12f+(slot/3)*1.2f);crate.gameObject.SetActive(cargoDoor);slot++;}}
            var stagedRoot=Root("Dock-side cargo awaiting loading",cargoVisuals);dockVisuals=stagedRoot;dockVisuals.gameObject.SetActive(AtPort);
            slot=0;foreach(var good in goods){int count=CargoHandling.Staged(save,save.world,good);for(int i=0;i<Mathf.Min(count,4);i++){var crate=MakeCargoCrate(good,stagedRoot);crate.localPosition=new Vector3(-Spec.width*.62f-2-(slot%3)*1.2f,-StandHeight+.65f,-Spec.length*.12f+(slot/3)*1.4f);slot++;}}
        }
        Transform MakeCargoCrate(string good,Transform parent)
        {
            var t=Root(good+" / sealed freight unit",parent);Crate(t,Vector3.zero,1);
            var texture=Resources.Load<Material>("OriginalSurfaces/machinery-10");if(texture!=null)foreach(var r in t.GetComponentsInChildren<MeshRenderer>())r.sharedMaterial=texture;
            Label(t,good.ToUpperInvariant()+"\n1 UNIT",new Vector3(0,.55f,-.51f),.005f,new Color(.9f,.88f,.74f));return t;
        }
        void ToggleCargoDoor()
        {
            if(!AtPort||cargoTransfer!=null){Toast("Cargo hatch interlock: land and complete the active transfer first.");return;}
            cargoDoor=!cargoDoor;RebuildCargo();Toast(cargoDoor?"Cargo hatch open. Move alongside the marked freight ramp to load or unload.":"Cargo hatch secured.");
        }
        bool StartCargoTransfer(string good,bool load)
        {
            if(!AtCargoAccess||!cargoDoor||cargoTransfer!=null)return false;
            if(load&&(CargoHandling.Staged(save,save.world,good)<1||Progression.Used(save)>=Spec.capacity)||!load&&Progression.Cargo(save,good)<1)return false;
            var dock=ship.TransformPoint(new Vector3(-Spec.width*.62f-2,-StandHeight+.65f,-Spec.length*.12f));
            var hold=ship.TransformPoint(new Vector3(-Spec.width*.34f,-StandHeight+1,-Spec.length*.12f));
            var crate=MakeCargoCrate(good,transform);crate.position=load?dock:hold;
            cargoTransfer=new CargoMove{world=save.world,good=good,load=load,crate=crate,from=crate.position,to=load?hold:dock};
            Toast((load?"Loading ":"Unloading ")+good+". Inventory changes when the container reaches its destination.");return true;
        }
        void TickCargo(float dt)
        {
            if(dockVisuals!=null)dockVisuals.gameObject.SetActive(AtPort);
            if(cargoTransfer==null)return;var op=cargoTransfer;
            if(!AtPort||!cargoDoor||op.world!=save.world){Destroy(op.crate.gameObject);cargoTransfer=null;Toast("Transfer cancelled; the manifest is unchanged.");return;}
            op.elapsed+=dt;float t=Mathf.Clamp01(op.elapsed/2.5f);op.crate.position=Vector3.Lerp(op.from,op.to,Mathf.SmoothStep(0,1,t))+Vector3.up*Mathf.Sin(t*Mathf.PI)*.35f;
            if(t<1)return;
            bool moved=CargoHandling.Transfer(save,op.world,op.good,Spec.capacity,op.load);Destroy(op.crate.gameObject);cargoTransfer=null;
            if(moved)foreach(var job in save.economy.jobs)if(job.status=="awaiting loading"&&Progression.Cargo(save,job.good)>=job.units)job.status="in transit";
            RebuildCargo();Save();Toast(moved?(op.load?"Container secured in hold. ":"Container delivered to dock. ")+"Loaded mass: "+LoadedMass.ToString("0.0")+" t.":"Transfer rejected; manifest unchanged.");
        }
        void CargoPanel()
        {
            Tag("VESSEL HOLD",Progression.Used(save)+" / "+Spec.capacity,400,230,270);Tag("LOADED MASS",LoadedMass.ToString("0.0")+" t",700,230,230);
            if(Button(cargoDoor?"CLOSE HATCH":"OPEN HATCH",1010,235,300,44,false,AtPort&&cargoTransfer==null))ToggleCargoDoor();
            Text(AtCargoAccess?"At cargo access. Load staged purchases into the hold; unload goods before selling them.":"Leave the seat with F and walk alongside the freight ramp. E opens the cargo manifest there.",400,316,905,73,18,muted);
            string[] goods={"organics","ore","crystal"};for(int i=0;i<3;i++){string good=goods[i];float y=419+i*85;
                Text(good.ToUpperInvariant(),400,y,200,25,19,paper,true);Text("HOLD "+Progression.Cargo(save,good)+"   DOCK "+CargoHandling.Staged(save,save.world,good),610,y,265,30,16,aqua);
                if(Button("LOAD 1",900,y-7,190,45,false,AtCargoAccess&&cargoDoor&&cargoTransfer==null&&CargoHandling.Staged(save,save.world,good)>0&&Progression.Used(save)<Spec.capacity))StartCargoTransfer(good,true);
                if(Button("UNLOAD 1",1107,y-7,200,45,false,AtCargoAccess&&cargoDoor&&cargoTransfer==null&&Progression.Cargo(save,good)>0))StartCargoTransfer(good,false);}
            Text(cargoTransfer!=null?"TRANSFER IN PROGRESS / "+(cargoTransfer.elapsed/2.5f*100).ToString("0")+"%":"Cargo mass affects acceleration and braking. An open hatch prevents launch and jump.",400,708,907,55,17,amber);
        }
    }
}
