using UnityEngine;
namespace SpacePatriot
{
    public class OriginalDoorPart : MonoBehaviour
    {
        public string id;
        float opening;
        public void SetOpen(bool open,float dt)
        {
            opening=Mathf.MoveTowards(opening,open?1:0,dt*1.8f);
            float scale=Mathf.Lerp(1,.03f,opening);
            var center=GetComponent<MeshFilter>().sharedMesh.bounds.center;
            // Retract into the lintel around the shutter's own center; a full
            // upward translation would occupy the deck above.
            transform.localScale=new Vector3(1,scale,1);
            transform.localPosition=new Vector3(0,center.y*(1-scale)+opening*1.32f,0);
        }
    }
}
