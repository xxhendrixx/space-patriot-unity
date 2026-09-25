using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using static SpacePatriot.IndustrialArt;
namespace SpacePatriot
{
    public partial class FrontierWorld
    {
        public const float PlanetRadius=18000, RegionRadius=3000, RingStep=25;
        public const int LongitudeCount=256;
        const float AngleStep=2*Mathf.PI/LongitudeCount;
        public WorldworksTerrain terrainFields;
        public Grassworks grass;
        Mesh streamedTerrainMesh;
        Transform streamedTerrainRoot;
        Material terrainMaterial;
        Vector2 streamedTerrainAnchor;
        bool streamedTerrainWalking;
        public Vector3 PlanetCenter=>new Vector3(0,-PlanetRadius-3,0);
        float PlanetwideRelief(Vector3 normal)
        {
            normal.Normalize();float seed=(info.seed%65521)*.0017f;
            Vector3 weights=new Vector3(Mathf.Abs(normal.x),Mathf.Abs(normal.y),Mathf.Abs(normal.z));weights/=Mathf.Max(.001f,weights.x+weights.y+weights.z);
            float broad=weights.x*Mathf.PerlinNoise(normal.y*19+seed,normal.z*19-seed*.31f)+weights.y*Mathf.PerlinNoise(normal.x*19+seed*.73f,normal.z*19+seed)+weights.z*Mathf.PerlinNoise(normal.x*19-seed*.22f,normal.y*19+seed*.47f);
            float ridged=weights.x*Mathf.PerlinNoise(normal.y*57-seed,normal.z*57+seed*.19f)+weights.y*Mathf.PerlinNoise(normal.x*57+seed*.11f,normal.z*57-seed)+weights.z*Mathf.PerlinNoise(normal.x*57+seed*.29f,normal.y*57-seed*.37f);
            float amplitude=info.biome=="ice"?76:info.biome=="temperate"?92:info.biome=="volcanic"?145:118;
            return (broad-.5f)*amplitude+(ridged-.5f)*amplitude*.24f;
        }
        public float RawPlanetHeight(float x,float z)
        {
            float radius=new Vector2(x,z).magnitude;
            float curvature=Mathf.Sqrt(Mathf.Max(0,PlanetRadius*PlanetRadius-radius*radius))-PlanetRadius-3;
            if(info.biome=="gas")return curvature;
            // Preserve the port's working plane; fade it into the original engine's hills.
            float flatDistance=new Vector2(Mathf.Max(0,Mathf.Abs(x-120)-315),Mathf.Max(0,Mathf.Abs(z)-260)).magnitude;
            float basin=Mathf.SmoothStep(0,1,flatDistance/230);
            float edge=1-Mathf.SmoothStep(0,1,(radius-2400)/600);
            float relief=terrainFields.Sample(x,z).x;
            var radial=new Vector3(x,PlanetRadius+curvature,z).normalized;
            float macro=PlanetwideRelief(radial)*Mathf.SmoothStep(2000,3900,radius);
            return Mathf.Lerp(-3,curvature+macro+Mathf.Clamp(relief,-16,55)*.62f*edge,basin);
        }
        Vector3 RingVertex(int ring,int sector)
        {
            float a=sector*AngleStep,r=ring*RingStep,x=Mathf.Cos(a)*r,z=Mathf.Sin(a)*r;
            return new Vector3(x,RawPlanetHeight(x,z),z);
        }
        static float TriangleHeight(Vector3 p,Vector3 a,Vector3 b,Vector3 c)
        {
            float den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
            float u=((b.z-c.z)*(p.x-c.x)+(c.x-b.x)*(p.z-c.z))/den;
            float v=((c.z-a.z)*(p.x-c.x)+(a.x-c.x)*(p.z-c.z))/den;
            return a.y*u+b.y*v+c.y*(1-u-v);
        }
        public float Height(float x,float z)
        {
            float radius=new Vector2(x,z).magnitude;if(radius<.001f)return RawPlanetHeight(0,0);
            if(radius>=RegionRadius-1)return RawPlanetHeight(x,z);
            float angle=Mathf.Repeat(Mathf.Atan2(z,x),Mathf.PI*2);int sector=Mathf.FloorToInt(angle/AngleStep);
            // Rings are polygons. Use the chord distance, not circular radius, to select a cell.
            float radial=radius*Mathf.Cos(angle-(sector+.5f)*AngleStep)/Mathf.Cos(AngleStep*.5f);
            int ring=Mathf.FloorToInt(radial/RingStep);
            Vector3 p=new Vector3(x,0,z),a=RingVertex(ring,sector),b=RingVertex(ring,sector+1),c=RingVertex(ring+1,sector),d=RingVertex(ring+1,sector+1);
            if(ring==0)return TriangleHeight(p,a,c,d);
            float side=(c.x-b.x)*(p.z-b.z)-(c.z-b.z)*(p.x-b.x);
            float aside=(c.x-b.x)*(a.z-b.z)-(c.z-b.z)*(a.x-b.x);
            return side*aside>=0?TriangleHeight(p,a,b,c):TriangleHeight(p,b,d,c);
        }
        Color GlobeColor(Vector3 normal)
        {
            float seed=info.seed%997;
            float n=Mathf.PerlinNoise(normal.x*3+seed,normal.z*3+normal.y*2)*.7f+Mathf.PerlinNoise(normal.x*12+seed,normal.z*12+normal.y*7)*.3f;
            Color c=Color.Lerp(info.Surface*.45f,info.Surface*1.6f,n);
            if(info.biome=="temperate")c=n<.48f?Color.Lerp(new Color(.016f,.045f,.085f),new Color(.03f,.13f,.18f),n/.48f):Color.Lerp(new Color(.12f,.19f,.09f),new Color(.38f,.34f,.18f),Mathf.InverseLerp(.48f,.78f,n));
            if(info.biome=="gas")c=Color.Lerp(info.Surface*.6f,info.Surface*1.8f,.5f+.5f*Mathf.Sin(normal.z*65+n*12));
            if(info.biome=="ice")c=Color.Lerp(c,new Color(.74f,.81f,.85f),.65f);
            if(info.biome=="temperate")c=Color.Lerp(c,new Color(.79f,.83f,.85f),Mathf.SmoothStep(0,1,(Mathf.Abs(normal.z)-.72f)/.21f));
            return c;
        }
        void Terrain()
        {
            terrainFields=new WorldworksTerrain(info.id);
            var vertices=new List<Vector3>();var colors=new List<Color>();var uv=new List<Vector2>();var indices=new List<int>();
            void Add(Vector3 p,float local){vertices.Add(p);colors.Add(GlobeColor((p-PlanetCenter).normalized));uv.Add(new Vector2(local,0));}
            Add(new Vector3(0,RawPlanetHeight(0,0),0),1);
            int rings=120+112;float cap=Mathf.Asin(RegionRadius/PlanetRadius);
            for(int ring=1;ring<=rings;ring++)for(int j=0;j<LongitudeCount;j++)
            {
                Vector3 p;float local=0;
                if(ring<=120){p=RingVertex(ring,j);local=1-Mathf.SmoothStep(0,1,(ring*RingStep-2100)/900);}
                else{float theta=Mathf.Lerp(cap,Mathf.PI,(ring-120)/113f),a=j*AngleStep;var radial=new Vector3(Mathf.Sin(theta)*Mathf.Cos(a),Mathf.Cos(theta),Mathf.Sin(theta)*Mathf.Sin(a));float reliefWeight=Mathf.SmoothStep(2000,3900,theta*PlanetRadius);p=PlanetCenter+radial*(PlanetRadius+PlanetwideRelief(radial)*reliefWeight);}
                Add(p,local);
            }
            Add(PlanetCenter-Vector3.up*PlanetRadius,0);
            void Tri(int a,int b,int c){var n=Vector3.Cross(vertices[b]-vertices[a],vertices[c]-vertices[a]);if(Vector3.Dot(n,vertices[a]-PlanetCenter)<0){int t=b;b=c;c=t;}indices.Add(a);indices.Add(b);indices.Add(c);}
            for(int j=0;j<LongitudeCount;j++)Tri(0,1+j,1+(j+1)%LongitudeCount);
            for(int ring=0;ring<rings-1;ring++)for(int j=0;j<LongitudeCount;j++){int a=1+ring*LongitudeCount+j,b=1+ring*LongitudeCount+(j+1)%LongitudeCount,c=a+LongitudeCount,d=b+LongitudeCount;Tri(a,b,c);Tri(b,d,c);}
            for(int j=0;j<LongitudeCount;j++)Tri(vertices.Count-1,1+(rings-1)*LongitudeCount+j,1+(rings-1)*LongitudeCount+(j+1)%LongitudeCount);
            var mesh=new Mesh{name=info.name+" / continuous Worldworks planet",indexFormat=IndexFormat.UInt32};mesh.SetVertices(vertices);mesh.SetColors(colors);mesh.SetUVs(0,uv);mesh.SetTriangles(indices,0);mesh.RecalculateNormals();mesh.RecalculateBounds();generatedAssets.Add(mesh);
            var source=Resources.Load<Material>("OriginalSurfaces/geology-"+(info.biome=="desert"?5:info.biome=="ice"?10:info.biome=="volcanic"?14:info.biome=="temperate"?6:8));
            terrainMaterial=new Material(Resources.Load<Shader>("Shaders/WorldworksPlanet"));terrainMaterial.SetTexture("_GroundMap",source.GetTexture("_BaseMap"));terrainMaterial.SetTexture("_RockMap",Resources.Load<Material>("OriginalSurfaces/geology-"+(info.biome=="desert"?1:info.biome=="ice"?9:2)).GetTexture("_BaseMap"));terrainMaterial.SetFloat("_Living",info.biome=="temperate"?1:0);terrainMaterial.SetFloat("_Seed",info.seed%997);generatedAssets.Add(terrainMaterial);
            var ground=MeshObject("Continuous spherical terrain",content,mesh,terrainMaterial,Vector3.zero,Vector3.one);ground.AddComponent<MeshCollider>().sharedMesh=mesh;
        }
        public void StreamSurface(Vector3 focus,bool walking)
        {
            if(info==null||info.biome=="gas"||Mathf.Abs(focus.y-Height(focus.x,focus.z))>650||new Vector2(focus.x,focus.z).magnitude>PlanetRadius*.94f)
            {if(streamedTerrainRoot)streamedTerrainRoot.gameObject.SetActive(false);return;}
            float recenter=walking?120:1200;
            if(streamedTerrainMesh&&streamedTerrainWalking==walking&&Vector2.Distance(new Vector2(focus.x,focus.z),streamedTerrainAnchor)<recenter)
            {if(!streamedTerrainRoot.gameObject.activeSelf)streamedTerrainRoot.gameObject.SetActive(true);return;}
            BuildStreamedSurface(focus,walking);
        }
        void BuildStreamedSurface(Vector3 focus,bool walking)
        {
            const float halfSize=6000,offset=.035f;int segments=walking?192:96,side=segments+1,count=side*side;
            var vertices=new Vector3[count];var colors=new Color[count];var uvs=new Vector2[count];var triangles=new int[segments*segments*6];
            float Spread(float value)=>Mathf.Sign(value)*Mathf.Pow(Mathf.Abs(value),2.1f);
            for(int z=0;z<side;z++)
            {
                float localZ=Spread(z/(float)segments*2-1)*halfSize;
                for(int x=0;x<side;x++)
                {
                    float localX=Spread(x/(float)segments*2-1)*halfSize;float worldX=focus.x+localX,worldZ=focus.z+localZ;
                    int k=z*side+x;float y=Height(worldX,worldZ)+offset;vertices[k]=new Vector3(localX,y-focus.y,localZ);
                    colors[k]=GlobeColor((new Vector3(worldX,y,worldZ)-PlanetCenter).normalized);uvs[k]=new Vector2(1,0);
                }
            }
            int t=0;for(int z=0;z<segments;z++)for(int x=0;x<segments;x++)
            {int a=z*side+x,b=a+1,c=a+side,d=c+1;triangles[t++]=a;triangles[t++]=c;triangles[t++]=b;triangles[t++]=b;triangles[t++]=c;triangles[t++]=d;}
            var next=new Mesh{name=info.name+" / streamed Worldworks terrain",indexFormat=IndexFormat.UInt32};next.vertices=vertices;next.colors=colors;next.uv=uvs;next.triangles=triangles;next.RecalculateNormals();next.RecalculateBounds();
            if(!streamedTerrainRoot){streamedTerrainRoot=new GameObject("Worldworks / moving terrain patch").transform;streamedTerrainRoot.SetParent(transform,false);var filter=streamedTerrainRoot.gameObject.AddComponent<MeshFilter>();var renderer=streamedTerrainRoot.gameObject.AddComponent<MeshRenderer>();renderer.sharedMaterial=terrainMaterial;renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=true;}
            streamedTerrainRoot.localPosition=new Vector3(focus.x,focus.y,focus.z);streamedTerrainRoot.GetComponent<MeshFilter>().sharedMesh=next;
            if(streamedTerrainMesh)Destroy(streamedTerrainMesh);streamedTerrainMesh=next;streamedTerrainAnchor=new Vector2(focus.x,focus.z);streamedTerrainWalking=walking;streamedTerrainRoot.gameObject.SetActive(true);
        }
    }
}
