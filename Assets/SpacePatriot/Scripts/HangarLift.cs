using System.Collections.Generic;
using UnityEngine;
namespace SpacePatriot
{
    public class HangarLift : MonoBehaviour
    {
        readonly List<Transform> platform=new List<Transform>(),roof=new List<Transform>();
        float phase;bool raising;
        public bool Ready=>phase>=1;
        public bool Raising=>raising;
        public float DeckOffset=>Mathf.SmoothStep(0,26,phase);
        public void Initialize()
        {
            foreach(var t in GetComponentsInChildren<Transform>()){
                if(t.name=="Hangar lift platform")platform.Add(t);
                if(t.name.StartsWith("Hangar roof"))roof.Add(t);
            }
            var collider=new GameObject("Lift deck collision");collider.transform.SetParent(transform,false);collider.AddComponent<BoxCollider>().size=new Vector3(136,1,235);platform.Add(collider.transform);
        }
        public void Raise(){raising=true;}
        void Update()=>Advance(Time.deltaTime);
        public void Advance(float dt)
        {
            if(!raising||Ready)return;float old=phase;phase=Mathf.MoveTowards(phase,1,dt/9);float y=Mathf.SmoothStep(0,26,phase),before=Mathf.SmoothStep(0,26,old);
            foreach(var t in platform)t.localPosition=Vector3.up*y;
            foreach(var t in roof)t.localPosition=Vector3.right*(t.name.EndsWith("-1")?-1:1)*Mathf.Clamp01(y/8)*78;
            var g=FrontierGame.Instance;if(g!=null&&g.ship!=null&&!g.flying&&Mathf.Abs(g.ship.position.x-transform.position.x)<65&&Mathf.Abs(g.ship.position.z-transform.position.z)<110)g.ship.position+=Vector3.up*(y-before);
            if(g!=null&&g.world!=null)foreach(var p in g.world.places)if(p.name=="Port 07 landing pad")p.position=new Vector3(0,g.world.Deck+y+2.65f,0);
        }
    }
}
