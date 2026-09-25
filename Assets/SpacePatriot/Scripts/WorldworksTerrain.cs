using System.IO;
using UnityEngine;

namespace SpacePatriot
{
    // Baked by executing the original Worldworks and Terrainworks JavaScript cores.
    // Four channels retain height, moisture, temperature and rock exposure.
    public sealed class WorldworksTerrain
    {
        public readonly int resolution;
        public readonly float size;
        public readonly uint seed;
        readonly Vector4[] samples;
        public WorldworksTerrain(string id)
        {
            var asset=Resources.Load<TextAsset>("Worldworks/"+id);
            if(asset==null){resolution=0;return;}
            using var reader=new BinaryReader(new MemoryStream(asset.bytes));
            resolution=reader.ReadInt32();size=reader.ReadSingle();seed=reader.ReadUInt32();reader.ReadSingle();
            samples=new Vector4[resolution*resolution];
            for(int i=0;i<samples.Length;i++)samples[i]=new Vector4(reader.ReadSingle(),reader.ReadSingle(),reader.ReadSingle(),reader.ReadSingle());
        }
        public Vector4 Sample(float x,float z)
        {
            if(samples==null)return new Vector4(0,.2f,.5f,.8f);
            float gx=Mathf.Clamp((x/size+.5f)*(resolution-1),0,resolution-1.001f),gz=Mathf.Clamp((z/size+.5f)*(resolution-1),0,resolution-1.001f);
            int ix=(int)gx,iz=(int)gz,k=iz*resolution+ix;
            return Vector4.Lerp(Vector4.Lerp(samples[k],samples[k+1],gx-ix),Vector4.Lerp(samples[k+resolution],samples[k+resolution+1],gx-ix),gz-iz);
        }
    }
}
