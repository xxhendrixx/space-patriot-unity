using UnityEngine;

namespace SpacePatriot
{
    /// <summary>CPU port of the original 64-cell periodic planetary noise and geology sampler.</summary>
    public sealed class PlanetEngineSurface
    {
        const int NoiseSize=64;
        static readonly byte[] noise=CreateNoise();
        // Match Reference/Original/source/landscape.js. The original Worldworks
        // patch is authored in this body frame, so the globe sampler must use
        // the same axes or the close terrain and the distant continents drift.
        static readonly Vector3 sourceUp=new Vector3(.62f,.37f,.69f).normalized;
        static readonly Vector3 sourceRight=Vector3.Cross(Vector3.up,sourceUp).normalized;
        static readonly Vector3 sourceForward=Vector3.Cross(sourceUp,sourceRight).normalized;
        readonly int type;
        readonly float radiusKm,amplitude,frequency,terrainBase;
        readonly Vector3 offset;

        static byte[] CreateNoise()
        {
            var data=new byte[NoiseSize*NoiseSize*NoiseSize];
            for(int i=0;i<data.Length;i++)data[i]=(byte)(Hash((uint)i^41827u)>>24);
            return data;
        }
        static uint Hash(uint x)
        {
            unchecked{x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;return x^(x>>16);}
        }
        static float Random01(ref uint state)
        {
            unchecked
            {
                state+=0x6d2b79f5u;uint t=(state^(state>>15))*(state|1u);
                t^=t+((t^(t>>7))*(t|61u));return (t^(t>>14))/4294967296f;
            }
        }
        static float Smooth01(float t)=>t*t*(3-2*t);
        static float At(int x,int y,int z)=>noise[(x&63)+((y&63)<<6)+((z&63)<<12)]/255f;
        static float Noise(Vector3 p)
        {
            int ix=Mathf.FloorToInt(p.x),iy=Mathf.FloorToInt(p.y),iz=Mathf.FloorToInt(p.z);
            float x=Smooth01(p.x-ix),y=Smooth01(p.y-iy),z=Smooth01(p.z-iz);
            float a=Mathf.Lerp(Mathf.Lerp(At(ix,iy,iz),At(ix+1,iy,iz),x),Mathf.Lerp(At(ix,iy+1,iz),At(ix+1,iy+1,iz),x),y);
            float b=Mathf.Lerp(Mathf.Lerp(At(ix,iy,iz+1),At(ix+1,iy,iz+1),x),Mathf.Lerp(At(ix,iy+1,iz+1),At(ix+1,iy+1,iz+1),x),y);
            return Mathf.Lerp(a,b,z);
        }
        static float SmoothStep(float lo,float hi,float value)=>Smooth01(Mathf.Clamp01((value-lo)/(hi-lo)));

        /// <summary>The globe-scale height in living.js Universe.rawHeight.</summary>
        public float SourceHeightMeters(Vector3 unityNormal)
        {
            if(type==3)return 0;
            Vector3 normal=ToSourceNormal(unityNormal.normalized);
            float q=Noise(normal*(12*frequency)+offset)*2-1;
            float regional=.58f*Noise(normal*(3.5f*frequency)+offset)+.26f*(1-q*q)+.14f*Noise(normal*(42*frequency)+offset)+.02f*Noise(normal*(135*frequency)+offset);
            return radiusKm*amplitude*(regional-terrainBase-.02f)*FrontierWorld.PlanetRadius/radiusKm;
        }

        public PlanetEngineSurface(WorldInfo world)
        {
            type=world.biome switch{"temperate"=>1,"desert"=>2,"gas"=>3,"ice"=>4,"volcanic"=>5,_=>0};
            radiusKm=Mathf.Clamp(Mathf.Sqrt(Mathf.Max(.0001f,world.radius))*900,160,3600);
            uint seed=unchecked((uint)world.seed),state=seed;
            Random01(ref state); // living.js consumes one value for the body's position before its terrain profile.
            amplitude=type==3?0:.0025f+Random01(ref state)*.002f;
            frequency=.75f+Random01(ref state)*.75f;
            terrainBase=type==1?.53f:.44f;
            offset=new Vector3(seed%57,(seed>>8)%59,(seed>>16)%61);
        }

        /// <summary>Return the source engine's relief, scaled onto Unity's compressed planetary radius.</summary>
        public float HeightMeters(Vector3 normal)
        {
            if(type==3)return 0;
            normal=ToSourceNormal(normal.normalized);
            float q=Noise(normal*(12*frequency)+offset)*2-1;
            float regional=.58f*Noise(normal*(3.5f*frequency)+offset)+.26f*(1-q*q)+.14f*Noise(normal*(42*frequency)+offset)+.02f*Noise(normal*(135*frequency)+offset);
            float warp=Noise(normal*(73*frequency)+offset);
            float channel=1-SmoothStep(.018f,.093f,Mathf.Abs(Noise(normal*(260*frequency)+offset)-.5f+(warp-.5f)*.16f));
            float detail=Noise(normal*(1500*frequency)+offset)-.5f;
            float ridge=1-Mathf.Abs(Noise(normal*(95*frequency)+offset)*2-1);float landform;
            if(type==0)
            {
                Vector3 qv=normal*(frequency*48)+offset;Vector3 cell=new Vector3(Mathf.Floor(qv.x+.5f),Mathf.Floor(qv.y+.5f),Mathf.Floor(qv.z+.5f));
                float jitter=Noise(cell*.73f+offset)-.5f;float d=(qv-cell-Vector3.one*(jitter*.12f)).magnitude;
                landform=.026f*Mathf.Exp(-Mathf.Pow((d-.32f)/.055f,2))-.046f*(1-SmoothStep(.2f,.31f,d))+.009f*ridge;
            }
            else if(type==2)
            {
                float dune=Mathf.Pow(.5f+.5f*Mathf.Sin((normal.x*.82f+normal.z*.58f)*frequency*480+warp*4),3);
                landform=.024f*dune+.065f*SmoothStep(.54f,.71f,Noise(normal*(42*frequency)+offset))-.016f*channel;
            }
            else if(type==4)landform=.04f*Mathf.Pow(ridge,5)-.045f*Mathf.Pow(channel,3)+.018f*Mathf.Abs(Mathf.Sin(normal.y*frequency*260+warp*3));
            else if(type==5)
            {
                float vents=Noise(normal*(62*frequency)+offset);
                landform=.1f*SmoothStep(.59f,.74f,vents)-.055f*SmoothStep(.73f,.83f,vents)-.025f*channel+.025f*Mathf.Pow(ridge,4);
            }
            else
            {
                float mountains=SmoothStep(.48f,.72f,Noise(normal*(18*frequency)+offset));
                landform=.055f*mountains*Mathf.Pow(ridge,3)-.013f*channel*(.4f+warp);
            }

            Vector3 km=normal*radiusKm;
            float Local(float scale)=>Noise(km*scale+offset);
            float broad=Local(.7f),fineRidge=1-Mathf.Abs(Local(2.6f)*2-1),relief=Mathf.Min(.2f,radiusKm*amplitude*.23f);float localForm;
            if(type==0)
            {
                Vector3 p=km*1.8f+offset;float d=(p-new Vector3(Mathf.Floor(p.x+.5f),Mathf.Floor(p.y+.5f),Mathf.Floor(p.z+.5f))).magnitude;
                localForm=.28f*Mathf.Exp(-Mathf.Pow((d-.31f)/.07f,2))-.32f*(1-SmoothStep(.13f,.3f,d))+.18f*broad;
            }
            else if(type==2)
            {
                float dune=Mathf.Pow(.5f+.5f*Mathf.Sin(km.x*7.5f+km.z*4.2f+Local(.6f)*3),3);
                localForm=.36f*dune+.64f*SmoothStep(.48f,.72f,Local(1.2f));
            }
            else if(type==4)localForm=.7f*Mathf.Pow(fineRidge,7)+.26f*broad-.1f*Mathf.Pow(1-fineRidge,3);
            else if(type==5)localForm=.72f*Mathf.Pow(fineRidge,2)+.25f*SmoothStep(.45f,.7f,Local(1.1f));
            else localForm=.75f*SmoothStep(.32f,.75f,broad)*Mathf.Pow(fineRidge,2)+.12f*Local(4);

            float heightKm=radiusKm*amplitude*(regional-terrainBase-.02f+landform+.0018f*detail)+relief*localForm;
            return heightKm*FrontierWorld.PlanetRadius/radiusKm;
        }

        /// <summary>Unity's local pole is the original Landscape.up direction.</summary>
        public static Vector3 ToSourceNormal(Vector3 unityNormal)
            =>(sourceRight*unityNormal.x+sourceUp*unityNormal.y+sourceForward*unityNormal.z).normalized;
    }
}
