using UnityEngine;
namespace SpacePatriot
{
    [DefaultExecutionOrder(-30)]
    public class BuildingLift : MonoBehaviour
    {
        public int levels=3,target;
        public float baseHeight=1.06f;
        public float height;
        float opening=1;
        BuildingLiftPart[] parts;
        Transform floorCollider;
        public bool Near(Vector3 position){var p=transform.InverseTransformPoint(position);return Mathf.Abs(p.x)<3.5f&&Mathf.Abs(p.z+9)<4.5f&&Mathf.Abs(p.y-height-1.75f)<2;}
        public void RequestNext(){target=(target+1)%levels;opening=0;FrontierGame.Instance.Toast("Lift travelling to floor "+(target+1)+".");}
        void Start(){height=baseHeight;parts=GetComponentsInChildren<BuildingLiftPart>();var floor=new GameObject("Moving lift floor");floorCollider=floor.transform;floorCollider.SetParent(transform,false);floor.AddComponent<BoxCollider>().size=new Vector3(3.35f,.2f,3.8f);}
        void Update(){if(parts==null)return;float wanted=baseHeight+target*3.8f;height=Mathf.MoveTowards(height,wanted,Time.deltaTime*1.6f);bool arrived=Mathf.Abs(height-wanted)<.001f;opening=Mathf.MoveTowards(opening,arrived?1:0,Time.deltaTime*2);
            floorCollider.localPosition=new Vector3(0,height-.1f,-10);
            foreach(var part in parts)part.transform.localPosition=part.cabin?Vector3.up*(height-baseHeight):Vector3.right*part.side*(part.floor==target?opening:0)*1.45f;
        }
    }
}
