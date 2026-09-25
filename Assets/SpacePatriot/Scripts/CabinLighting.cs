using System.Collections.Generic;
using UnityEngine;

namespace SpacePatriot
{
    // Four lights are assigned to the nearest modeled ceiling fixtures, so long
    // multideck interiors stay lit without hundreds of active browser lights.
    public sealed class CabinLighting : MonoBehaviour
    {
        readonly List<Vector3> fixtures=new();
        readonly Light[] lights=new Light[4];
        readonly int[] selected=new int[4];
        public void Configure(DeckPlan plan)
        {
            fixtures.Add(new Vector3(-1,.65f,1));fixtures.Add(new Vector3(1,.65f,1));
            foreach(var deck in plan.decks)
                for(float z=2;z<plan.end;z+=5)fixtures.Add(new Vector3(0,deck.y+1.12f,-z));
            foreach(var room in plan.rooms)
                if(!room.id.StartsWith("corridor")&&room.id!="bridge")
                    for(float z=room.z0+1;z<room.z1;z+=3)fixtures.Add(new Vector3((room.x0+room.x1)/2,room.y+1.1f,-z));
            for(int i=0;i<4;i++){
                var lamp=new GameObject("Ceiling task light "+i).AddComponent<Light>();lamp.transform.SetParent(transform,false);
                lamp.type=LightType.Point;lamp.range=8;lamp.intensity=1.35f;lamp.color=new Color(1,.89f,.73f);lamp.shadows=LightShadows.None;lights[i]=lamp;
            }
        }
        void LateUpdate()
        {
            var game=FrontierGame.Instance;if(game==null||game.view==null)return;
            var eye=transform.InverseTransformPoint(game.view.transform.position);
            for(int i=0;i<lights.Length;i++){
                float best=float.MaxValue;int pick=-1;
                for(int j=0;j<fixtures.Count;j++){
                    bool used=false;for(int k=0;k<i;k++)used|=selected[k]==j;if(used)continue;
                    float distance=(eye-fixtures[j]).sqrMagnitude;if(distance<best){best=distance;pick=j;}
                }
                selected[i]=pick;lights[i].enabled=game.lightsOn&&pick>=0&&best<144;
                if(pick>=0)lights[i].transform.localPosition=fixtures[pick];
            }
        }
    }
}
