using UnityEngine;
namespace SpacePatriot
{
    public class CockpitControl:MonoBehaviour
    {
        public int action=-1,screen=-1;Transform pivot;float angle,target;
        public void InitializeMotion()
        {
            if(action<0||action>=100||pivot)return;
            var center=GetComponent<MeshFilter>().sharedMesh.bounds.center;
            pivot=new GameObject("Control spindle / "+action).transform;pivot.SetParent(transform.parent,false);pivot.localPosition=center;transform.SetParent(pivot,false);transform.localPosition=-center;
            if(action>=40&&action<=43)IndustrialArt.Box("Rotary index",pivot,new Vector3(0,.029f,-.04f),new Vector3(.007f,.029f,.006f),IndustrialArt.Bone);
        }
        public void Turn(int direction){target+=direction*24;}
        public void SetState(bool on){target=on?22:-22;}
        void Update(){if(!pivot)return;angle=Mathf.LerpAngle(angle,target,Time.deltaTime*18);pivot.localRotation=action>=40?Quaternion.Euler(0,0,angle):Quaternion.Euler(angle,0,0);}
    }
}
