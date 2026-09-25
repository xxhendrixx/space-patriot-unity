using UnityEngine;
namespace SpacePatriot
{
    // The user's WeatherModel wetness, snow accumulation and gust equations.
    // Unity adapts them to world climate, roof occlusion and the Spellworks pool.
    public sealed class Weatherworks : MonoBehaviour
    {
        public float Wetness=.32f,SnowCover,Rain,Snow,Wind=3,Gust=.16f,Temperature=22,Clock;
        public Vector3 WindVector {get;private set;}
        FrontierWorld world;float particlesDue;
        public void Initialize(FrontierWorld owner)
        {
            world=owner;
            if(owner.info.biome=="temperate"){Rain=owner.info.name=="Earth"?.12f:.35f;Wind=9;Gust=.4f;Temperature=12;}
            else if(owner.info.biome=="ice"){Snow=.6f;Temperature=-7;Wind=3;Gust=.2f;}
            else{Wetness=0;Wind=owner.info.biome=="desert"?15:0;Temperature=20;}
        }
        public void Step(float dt)
        {
            dt=Mathf.Clamp(dt,0,.1f);Clock+=dt;
            Wetness=Mathf.Clamp01(Wetness+dt*(Rain*.025f-(1-Rain)*(.0015f+Mathf.Max(0,Temperature)*.00023f)));
            SnowCover=Mathf.Clamp01(SnowCover+dt*(Snow*(Temperature<1?.014f:.002f)-Mathf.Max(0,Temperature)*.00085f-Rain*.012f));
            float gust=1+Gust*(Mathf.Sin(Clock*.65f)*.2f+Mathf.Sin(Clock*1.71f)*.13f+Mathf.Sin(Clock*.19f)*.35f);
            WindVector=new Vector3(Mathf.Sin(240*Mathf.Deg2Rad),0,Mathf.Cos(240*Mathf.Deg2Rad))*Wind*gust;
            Shader.SetGlobalVector("_WeatherworksSurface",new Vector4(Wetness,SnowCover,Rain,Snow));Shader.SetGlobalVector("_WeatherworksWind",WindVector);
        }
        void Update()
        {
            Step(Time.deltaTime);var game=FrontierGame.Instance;if(game?.view==null||game.effects==null||Rain+Snow==0)return;
            var eye=game.view.transform.position;if(eye.y-world.Height(eye.x,eye.z)>120)return;
            // Roof shielding includes Architectureworks buildings and the working hangar.
            if(Physics.Raycast(eye,Vector3.up,24,Physics.DefaultRaycastLayers,QueryTriggerInteraction.Ignore))return;
            particlesDue+=Time.deltaTime*360*(Rain+Snow);int count=Mathf.Min(40,(int)particlesDue);particlesDue-=count;
            for(int i=0;i<count;i++){
                Vector3 p=eye+new Vector3(Random.Range(-17f,17f),Random.Range(8f,18f),Random.Range(-17f,17f));
                float floor=world.Height(p.x,p.z);float duration=Mathf.Clamp((p.y-floor)/(Snow>0?3:26),.05f,1.4f);
                game.effects.Emit(p,WindVector*.18f+Vector3.down*(Snow>0?3:26),Snow>0?new Color(.7f,.77f,.82f):new Color(.22f,.29f,.34f),duration,Snow>0?.055f:.019f,Snow>0?0:1,0,0);
            }
        }
        void OnDestroy(){Shader.SetGlobalVector("_WeatherworksSurface",Vector4.zero);Shader.SetGlobalVector("_WeatherworksWind",Vector4.zero);}
    }
}
