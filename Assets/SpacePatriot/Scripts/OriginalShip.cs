using UnityEngine;
namespace SpacePatriot
{
    public class OriginalShip : MonoBehaviour
    {
        public Vector3 eye;
        public Transform exterior,cabin;
        public Transform[] gear;
        public TextMesh[] readouts;
        public void SetGear(bool down){foreach(var part in gear)if(part!=null)part.gameObject.SetActive(down);}
    }
}
