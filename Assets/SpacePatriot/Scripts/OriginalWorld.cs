using System;
using UnityEngine;
using static SpacePatriot.IndustrialArt;
namespace SpacePatriot
{
    [Serializable] public class BuildingCatalog {public OriginalBuilding[] buildings;}
    [Serializable] public class OriginalBuilding {public string model;public int levels;public BuildingCollider[] colliders;}
    [Serializable] public class BuildingCollider {public string id,kind;public float[] center,size;public float rotationY;}
    public partial class FrontierWorld
    {
        public HangarLift lift;
        Transform Original(string id,Vector3 at,Transform parent=null)
        {var prefab=Resources.Load<GameObject>("OriginalShips/"+id);if(prefab==null)throw new InvalidOperationException("Original environment prefab missing: "+id);var t=Instantiate(prefab,parent??content).transform;t.localPosition=at;return t;}
        void StructureCollider(Transform parent,Vector3 center,Vector3 size,string name="Structural collision",float rotation=0)
        {var g=new GameObject(name);g.transform.SetParent(parent,false);g.transform.localPosition=center;g.transform.localRotation=Quaternion.Euler(0,rotation,0);g.AddComponent<BoxCollider>().size=size;}
        void Port(Vector3 origin,bool small)
        {
            if(small){var remote=Original("outpost",origin-Vector3.up);StructureCollider(remote,new Vector3(0,0,0),new Vector3(120,2,120));
                Terminal(remote,new Vector3(11,1,-9),"REMOTE FREIGHT",Cyan);places.Add(new Place("Remote freight office","delivery",origin+new Vector3(11,0,-9),5));places.Add(new Place("Remote landing pad","landing",origin+Vector3.up*2.65f,50));return;}
            var port=Original("port",new Vector3(165,Deck-1,0));StructureCollider(port,new Vector3(0,-7,0),new Vector3(480,16,480));
            var hangar=Original("hangar",new Vector3(0,Deck-.5f,0));lift=hangar.gameObject.AddComponent<HangarLift>();
            StructureCollider(hangar,new Vector3(-73,17,0),new Vector3(4,36,248));StructureCollider(hangar,new Vector3(73,17,87),new Vector3(4,36,74));
            StructureCollider(hangar,new Vector3(73,17,-43),new Vector3(4,36,162));StructureCollider(hangar,new Vector3(73,19.5f,44),new Vector3(4,31,12));StructureCollider(hangar,new Vector3(0,17,-123),new Vector3(148,36,4));
            lift.Initialize();
            var buildings=JsonUtility.FromJson<BuildingCatalog>(Resources.Load<TextAsset>("Buildings").text).buildings;
            int index=0;foreach(float z in new[]{-54f,-22,10,42})foreach(float x in new[]{-72f,-40,40,72})
            {
                var spec=buildings[index%4];var b=Original(spec.model,new Vector3(165+x,Deck-1,-z));
                foreach(var c in spec.colliders){if(c.kind=="ceiling")continue;StructureCollider(b,new Vector3(c.center[0],c.center[1],-c.center[2]),new Vector3(c.size[0],c.size[1],c.size[2]),c.kind,-c.rotationY*Mathf.Rad2Deg);}
                var liftController=b.gameObject.AddComponent<BuildingLift>();liftController.levels=spec.levels;liftController.baseHeight=1.06f;
                places.Add(new Place("Building lift / "+(index+1),"lift",b.position+new Vector3(0,1.06f,-7.4f),3.3f));
                index++;
            }
            Terminal(hangar,new Vector3(-14,.5f,-22),"OPERATIONS",Cyan);Terminal(hangar,new Vector3(14,.5f,-22),"FREIGHT",WarmLight);Terminal(hangar,new Vector3(50,.5f,20),"ENGINEERING",Cyan);
            places.Add(new Place("Operations terminal","terminal",new Vector3(-14,Deck,-22),4));
            places.Add(new Place("Cargo receiving","delivery",new Vector3(14,Deck,-22),4));places.Add(new Place("City power bus","power",new Vector3(50,Deck,20),4));
            places.Add(new Place("Port 07 landing pad","landing",new Vector3(0,Deck+2.65f,0),62));
            places.Add(new Place("Capital ship apron","landing",new Vector3(165,Deck+2.65f,155),75));
        }
        void OrbitalStation()
        {
            var r=Original("station",station+Vector3.up*190);
            StructureCollider(r,new Vector3(0,-195,0),new Vector3(690,10,1400));
            for(int side=-1;side<=1;side+=2)StructureCollider(r,new Vector3(side*412.5f,25,0),new Vector3(135,430,1400));
            Terminal(r,new Vector3(20,-190,17),"TRAFFIC RECORDS",Cyan);places.Add(new Place("Station records","station",station+new Vector3(20,0,17),5));
            places.Add(new Place("Traffic station landing pad","landing",station+new Vector3(0,2.65f,-3),160));
        }
        public BuildingLift NearbyLift(Vector3 position){foreach(var elevator in content.GetComponentsInChildren<BuildingLift>())if(elevator.Near(position))return elevator;return null;}
    }
}
