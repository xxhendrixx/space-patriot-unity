using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
namespace SpacePatriot
{
    [Serializable] public class DeckCatalog {public DeckPlan[] plans;}
    [Serializable] public class DeckPlan {public int family;public float end;public DeckRoom[] rooms;public DeckFixture[] fixtures;public DeckDoor[] doors;public DeckStation[] stations;}
    [Serializable] public class DeckRoom {public string id,name;public float x0,x1,z0,z1;}
    [Serializable] public class DeckFixture {public string id,type;public float x,z,w,d,h;public bool solid;}
    [Serializable] public class DeckDoor {public string id,name,axis;public float x,z,width;}
    [Serializable] public class DeckStation {public string id,name;public float x,z;}
    public partial class FrontierGame
    {
        DeckPlan activeDeck;
        HashSet<string> openDoors=new HashSet<string>();
        string deckRoom="FLIGHT DECK";
        void WalkDeck(float dt)
        {
            if(activeDeck==null||activeDeck.family!=Spec.family){activeDeck=Array.Find(JsonUtility.FromJson<DeckCatalog>(Resources.Load<TextAsset>("DeckPlans").text).plans,p=>p.family==Spec.family);openDoors.Clear();foreach(var d in activeDeck.doors)openDoors.Add(d.id);}
            if(MouseButton(1)){var delta=Mouse.current.delta.ReadValue()*PlayerPrefs.GetFloat("sp.sensitivity",1);walkYaw+=delta.x*.12f;walkPitch=Mathf.Clamp(walkPitch+delta.y*.12f*(PlayerPrefs.GetInt("sp.invert",0)==1?1:-1),-75,75);}
            var pad=Gamepad.current;Vector2 sticks=pad?.leftStick.ReadValue()??Vector2.zero;
            var look=pad?.rightStick.ReadValue()??Vector2.zero;walkYaw+=(look.x*110+bindings.Axis("Yaw left","Yaw right")*90)*dt;walkPitch=Mathf.Clamp(walkPitch+(look.y*90*(PlayerPrefs.GetInt("sp.padInvert",0)==1?1:-1)+bindings.Axis("Pitch up","Pitch down")*65)*dt,-75,75);
            var motion=Quaternion.Euler(0,walkYaw,0)*new Vector3(bindings.Axis("Strafe left","Strafe right")+sticks.x,0,bindings.Axis("Reverse","Forward")+sticks.y)*(bindings.Held("Boost")?4.5f:2.4f)*dt;
            int steps=Mathf.Max(1,Mathf.CeilToInt(motion.magnitude/.1f));for(int i=0;i<steps;i++){var next=deckPosition+new Vector3(motion.x/steps,0,0);if(ValidDeck(next))deckPosition=next;next=deckPosition+new Vector3(0,0,motion.z/steps);if(ValidDeck(next))deckPosition=next;}
            deckRoom="CENTRAL PASSAGE";foreach(var room in activeDeck.rooms)if(room.id!="corridor"&&deckPosition.x>=room.x0&&deckPosition.x<=room.x1&&-deckPosition.z>=room.z0&&-deckPosition.z<=room.z1)deckRoom=room.name;
            foreach(var part in cabin.GetComponentsInChildren<OriginalDoorPart>())part.transform.localPosition=Vector3.up*(openDoors.Contains(part.id)?0:-3.3f);
            if(bindings.Down("Board / leave seat")){aboard=false;inputNeutral=true;return;}
            if(!Down(Key.E)&&!Down(Key.Z)&&pad?.buttonEast.wasPressedThisFrame!=true)return;
            if(-deckPosition.z>activeDeck.end-2.4f){if(flying){Toast("Airlock interlock: land before disembarking.");return;}aboard=false;walking=true;walkPosition=CargoAccess;walkPosition.y=world.SurfaceAt(walkPosition)+1.75f;return;}
            foreach(var station in activeDeck.stations)if(Vector2.Distance(new Vector2(deckPosition.x,-deckPosition.z),new Vector2(station.x,station.z))<1.8f){
                if(station.id=="pilot"){aboard=false;inputNeutral=true;}else {page="systems";menu=true;Toast(station.id=="engineering"?"Engineering station connected.":"Turret station restoration is still pending.");}return;}
            foreach(var door in activeDeck.doors)if(Vector2.Distance(new Vector2(deckPosition.x,-deckPosition.z),new Vector2(door.x,door.z))<2.2f){if(!openDoors.Add(door.id))openDoors.Remove(door.id);Toast(door.name+(openDoors.Contains(door.id)?" open.":" closed."));return;}
            if(deckRoom=="CARGO HOLD"){menu=true;page="cargo";}
        }
        bool ValidDeck(Vector3 position)
            =>DeckWalkable(activeDeck,openDoors,position);
        public static bool DeckWalkable(DeckPlan activeDeck,HashSet<string> openDoors,Vector3 position)
        {
            float x=position.x,z=-position.z;
            // Erode the union, not each room: adjacent doorways must remain connected.
            for(int i=0;i<12;i++){float a=i*Mathf.PI/6,px=x+Mathf.Cos(a)*.25f,pz=z+Mathf.Sin(a)*.25f;bool inside=false;
                foreach(var r in activeDeck.rooms)if(px>=r.x0&&px<=r.x1&&pz>=r.z0&&pz<=r.z1){inside=true;break;}if(!inside)return false;}
            foreach(var f in activeDeck.fixtures)if(f.solid&&Mathf.Abs(x-f.x)<f.w*.5f+.25f&&Mathf.Abs(z-f.z)<f.d*.5f+.25f)return false;
            foreach(var d in activeDeck.doors)if(!openDoors.Contains(d.id)&&(d.axis=="z"?Mathf.Abs(z-d.z)<.4f&&Mathf.Abs(x-d.x)<d.width*.5f+.25f:Mathf.Abs(x-d.x)<.4f&&Mathf.Abs(z-d.z)<d.width*.5f+.25f))return false;
            return true;
        }
    }
}
