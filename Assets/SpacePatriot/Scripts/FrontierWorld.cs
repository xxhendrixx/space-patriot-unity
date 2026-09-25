using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using static SpacePatriot.IndustrialArt;

namespace SpacePatriot
{
    public sealed class Place
    {
        public string name,kind;public Vector3 position;public float range;
        public Place(string n,string k,Vector3 p,float r=5){name=n;kind=k;position=p;range=r;}
    }
    public partial class FrontierWorld : MonoBehaviour
    {
        public WorldInfo info;
        public List<Place> places=new List<Place>();
        public Vector3 station=new Vector3(0,2500,1800), outpost=new Vector3(-410,0,380),grove=new Vector3(330,0,250);
        public float Deck=>info.biome=="gas"?125:12;
        Transform content;
        Transform orbit;
        readonly List<UnityEngine.Object> generatedAssets=new List<UnityEngine.Object>();
        public float Height(float x,float z)
        {
            const float step=25;float gx=(x+1800)/step,gz=(z+1800)/step;int ix=Mathf.FloorToInt(gx),iz=Mathf.FloorToInt(gz);float u=gx-ix,v=gz-iz;
            float ax=ix*step-1800,az=iz*step-1800,a=RawHeight(ax,az),b=RawHeight(ax+step,az),c=RawHeight(ax,az+step),d=RawHeight(ax+step,az+step);
            return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
        }
        float RawHeight(float x,float z)
        {
            float seed=(info.seed%1000)*.271f;
            float n=Mathf.PerlinNoise(x*.0017f+seed,z*.0017f+seed)*95+Mathf.PerlinNoise(x*.009f+seed,z*.009f)*19;
            float plateauDistance=new Vector2(Mathf.Max(0,Mathf.Abs(x-120)-315),Mathf.Max(0,Mathf.Abs(z)-260)).magnitude;
            float basin=Mathf.SmoothStep(0,1,Mathf.Clamp01(plateauDistance/300));
            float mountain=Mathf.SmoothStep(0,1,Mathf.Clamp01((new Vector2(x,z).magnitude-350)/750));
            float ridge=Mathf.Pow(1-Mathf.Abs(Mathf.PerlinNoise(x*.0011f+seed+4,z*.0011f+seed)*2-1),3);
            return -3+(n+mountain*ridge*260)*basin;
        }
        public void Generate(WorldInfo world)
        {
            info=world;if(content!=null){content.gameObject.SetActive(false);Destroy(content.gameObject);}places.Clear();
            foreach(var asset in generatedAssets)if(asset!=null)Destroy(asset);generatedAssets.Clear();
            content=Root(world.name+" / frontier",transform);Random.InitState(world.seed);
            RenderSettings.ambientMode=AmbientMode.Trilight;RenderSettings.ambientSkyColor=new Color(.68f,.72f,.77f);
            RenderSettings.ambientEquatorColor=new Color(.47f,.51f,.55f);RenderSettings.ambientGroundColor=new Color(.17f,.16f,.15f);
            RenderSettings.fog=true;RenderSettings.fogMode=FogMode.ExponentialSquared;RenderSettings.fogDensity=.0008f;
            RenderSettings.fogColor=world.biome=="desert"?new Color(.38f,.28f,.23f):new Color(.20f,.28f,.34f);
            var sunObj=new GameObject("Late afternoon sun");sunObj.transform.SetParent(content);sunObj.transform.rotation=Quaternion.Euler(24,-32,0);
            var sun=sunObj.AddComponent<Light>();sun.type=LightType.Directional;sun.color=new Color(1,.86f,.69f);sun.intensity=2.05f;sun.shadows=LightShadows.Soft;sun.shadowStrength=.83f;RenderSettings.sun=sun;
            Terrain();Port(Vector3.zero,false);
            outpost.y=Height(outpost.x,outpost.z)+5;Port(outpost,true);
            grove.y=Height(grove.x,grove.z);
            places.Add(new Place(world.biome=="temperate"?"Survey grove":"Geological survey","sample",grove,12));
            for(int i=0;i<14;i++)
            { float angle=i*2.4f;Vector3 pos=grove+new Vector3(Mathf.Sin(angle)*(4+i),0,Mathf.Cos(angle)*(4+i));pos.y=Height(pos.x,pos.z);Rock(pos,world.biome=="temperate"?2:1); }
            var survey=Root("Field survey station",content,grove);Terminal(survey,Vector3.zero,"SURVEY / 07",Cyan);
            Box("Survey field deck",survey,new Vector3(0,.5f,0),new Vector3(50,1,30),Steel,true);
            places.Add(new Place("Survey landing pad","landing",grove+new Vector3(-12,3.65f,0),13));
            OrbitalStation();
            for(int i=0;i<95;i++)
            {
                var p=new Vector3(Random.Range(-1100f,1100f),0,Random.Range(-1100f,1100f));
                if(p.magnitude<110||Vector3.Distance(new Vector3(p.x,0,p.z),new Vector3(outpost.x,0,outpost.z))<65)continue;
                p.y=Height(p.x,p.z);Rock(p,Random.Range(.8f,4));
            }
            // One combined static set avoids issuing a draw for every bolt and beam.
            var staticObjects=new List<GameObject>();foreach(var renderer in content.GetComponentsInChildren<MeshRenderer>()){renderer.gameObject.isStatic=renderer.GetComponentInParent<HangarLift>()==null&&renderer.GetComponent<BuildingLiftPart>()==null;if(renderer.gameObject.isStatic)staticObjects.Add(renderer.gameObject);}
            StaticBatchingUtility.Combine(staticObjects.ToArray(),content.gameObject);
            BuildOrbit();
        }
        void Terrain()
        {
            int count=144;float size=3600;var verts=new Vector3[(count+1)*(count+1)];var uv=new Vector2[verts.Length];var tris=new int[count*count*6];int q=0;
            for(int z=0;z<=count;z++)for(int x=0;x<=count;x++)
            { int i=z*(count+1)+x;float px=(x/(float)count-.5f)*size,pz=(z/(float)count-.5f)*size;verts[i]=new Vector3(px,Height(px,pz),pz);uv[i]=new Vector2(px*.02f,pz*.02f);
                if(x<count&&z<count){tris[q++]=i;tris[q++]=i+count+1;tris[q++]=i+1;tris[q++]=i+1;tris[q++]=i+count+1;tris[q++]=i+count+2;}
            }
            var mesh=new Mesh{name=info.name+" heightfield",vertices=verts,uv=uv,triangles=tris};mesh.RecalculateNormals();mesh.RecalculateTangents();mesh.RecalculateBounds();
            generatedAssets.Add(mesh);
            var surface=Resources.Load<Material>("OriginalSurfaces/geology-"+(info.biome=="desert"?5:info.biome=="ice"?10:info.biome=="volcanic"?14:info.biome=="temperate"?6:8));
            MeshObject("Weathered terrain",content,mesh,surface!=null?surface:Metal(info.id+" terrain",info.Surface,0,.96f),Vector3.zero,Vector3.one);
            if(info.biome=="gas")Box("Cloud sea",content,new Vector3(0,-8,0),new Vector3(3400,1,3400),Metal(info.id+" clouds",info.Surface*.85f,0,1));
        }
        void Rock(Vector3 p,float scale)
        {
            var go=GameObject.CreatePrimitive(PrimitiveType.Sphere);go.name="Eroded outcrop";go.transform.SetParent(content);go.transform.position=p;go.transform.localScale=new Vector3(scale*3,scale*1.7f,scale*2.1f);go.transform.rotation=Random.rotation;
            Object.Destroy(go.GetComponent<Collider>());go.GetComponent<Renderer>().sharedMaterial=Metal(info.id+" stone",info.Surface*.71f,.05f,.94f);
            var rockMesh=UnityEngine.Object.Instantiate(go.GetComponent<MeshFilter>().sharedMesh);var rockVertices=rockMesh.vertices;
            for(int v=0;v<rockVertices.Length;v++){var a=rockVertices[v];float f=.75f+Mathf.PerlinNoise(a.x*7+6,a.y*6+a.z*3+9)*.55f;rockVertices[v]=a*f;}
            rockMesh.vertices=rockVertices;rockMesh.RecalculateNormals();rockMesh.RecalculateBounds();go.GetComponent<MeshFilter>().sharedMesh=rockMesh;generatedAssets.Add(rockMesh);
            if(info.biome=="temperate" && scale>2)
            {
                var prefab=Resources.Load<GameObject>("OriginalShips/"+(info.name=="Earth"?"conifer":"alien-flora-"+(Mathf.Abs(Mathf.RoundToInt(p.x))%3)));
                if(prefab!=null){var tree=Instantiate(prefab,content).transform;tree.position=p;tree.localScale=Vector3.one*scale*.4f;}

            }
        }
        public float SurfaceAt(Vector3 pos)
        {
            float height=Height(pos.x,pos.z);
            if(Mathf.Abs(pos.x-165)<240&&Mathf.Abs(pos.z)<240)height=Mathf.Max(height,Deck);
            if(Mathf.Abs(pos.x)<75&&Mathf.Abs(pos.z)<125)height=Mathf.Max(height,Deck);
            if(Mathf.Abs(pos.x-outpost.x)<60&&Mathf.Abs(pos.z-outpost.z)<60)height=Mathf.Max(height,outpost.y);
            if(Mathf.Abs(pos.x-station.x)<345&&Mathf.Abs(pos.z-station.z)<700&&pos.y>station.y-15)height=Mathf.Max(height,station.y);
            if(Mathf.Abs(pos.x-grove.x)<25&&Mathf.Abs(pos.z-grove.z)<15)height=Mathf.Max(height,grove.y+1);
            // Find the supporting floor below the walker, never the roof above them.
            if(Physics.Raycast(pos+Vector3.up*.1f,Vector3.down,out var hit,Mathf.Max(4,pos.y-height+1),Physics.DefaultRaycastLayers,QueryTriggerInteraction.Ignore))height=Mathf.Max(height,hit.point.y);
            return height;
        }
        public Place Nearest(Vector3 p,string kind=null)
        {
            Place best=null;float distance=float.MaxValue;
            foreach(var place in places){if(kind!=null&&place.kind!=kind)continue;float d=Vector3.Distance(p,place.position);if(d<distance){best=place;distance=d;}}return best;
        }
        public void Atmosphere(Camera camera,float altitude)
        {
            float space=Mathf.InverseLerp(650,1200,altitude);
            if(orbit!=null)orbit.gameObject.SetActive(space>.05f);
            RenderSettings.fogDensity=Mathf.Lerp(.0008f,0,space);
            camera.clearFlags=space>.5f?CameraClearFlags.SolidColor:CameraClearFlags.Skybox;
            camera.backgroundColor=Color.Lerp(new Color(.13f,.19f,.25f),new Color(.003f,.006f,.012f),space);
            camera.farClipPlane=15000;
        }
        void BuildOrbit()
        {
            if(orbit!=null)Destroy(orbit.gameObject);orbit=Root("Orbital scale vista",transform);
            var planet=GameObject.CreatePrimitive(PrimitiveType.Sphere);planet.name=info.name+" / orbital globe";planet.transform.SetParent(orbit);planet.transform.position=new Vector3(0,-3640,0);planet.transform.localScale=Vector3.one*7200;Destroy(planet.GetComponent<Collider>());
            var texture=new Texture2D(512,256,TextureFormat.RGB24,true);texture.name=info.name+" geology";var pixels=new Color[512*256];float seed=info.seed%913;
            generatedAssets.Add(texture);
            for(int y=0;y<256;y++)for(int x=0;x<512;x++)
            {
                float u=x/512f,v=y/256f;float theta=u*Mathf.PI*2;
                float nx=Mathf.Cos(theta)*2+seed,nz=Mathf.Sin(theta)*2+seed;
                float n=Mathf.PerlinNoise(nx+v*2,nz+v*4)*.64f+Mathf.PerlinNoise(nx*3,nz*3+v*12)*.24f+Mathf.PerlinNoise(nx*11,nz*11+v*23)*.12f;
                Color c=Color.Lerp(info.Surface*.42f,info.Surface*1.7f,n);
                if(info.biome=="temperate")c=n<.49f?new Color(.035f,.12f,.19f):Color.Lerp(new Color(.13f,.21f,.12f),new Color(.46f,.41f,.26f),Mathf.InverseLerp(.49f,.8f,n));
                if(info.biome=="gas")c=Color.Lerp(info.Surface*.5f,info.Surface*1.8f,.5f+.5f*Mathf.Sin(v*130+n*8));
                if(info.biome=="volcanic"&&n>.65f)c=Color.Lerp(c,new Color(.9f,.25f,.04f),(n-.65f)*3);
                float polar=Mathf.SmoothStep(0,1,Mathf.Clamp01((Mathf.Abs(v-.5f)-.35f)*12));if(info.biome!="gas"&&info.biome!="volcanic")c=Color.Lerp(c,new Color(.71f,.77f,.78f),polar);
                float cloud=Mathf.PerlinNoise(nx*4+8,nz*4+v*14);if(info.biome=="temperate")c=Color.Lerp(c,new Color(.78f,.8f,.77f),Mathf.Clamp01((cloud-.52f)*3));
                pixels[y*512+x]=c;
            }
            texture.SetPixels(pixels);texture.Apply();var mat=Metal(info.id+" orbital surface",Color.white,.02f,.94f);mat.SetTexture("_BaseMap",texture);planet.GetComponent<Renderer>().sharedMaterial=mat;
            var vertices=new List<Vector3>();var triangles=new List<int>();
            Random.InitState(983);
            for(int i=0;i<700;i++)
            {
                Vector3 d=Random.onUnitSphere;if(d.y<-.18f)continue;Vector3 p=d*10000;Vector3 right=Vector3.Cross(d,Vector3.up).normalized*Random.Range(1.3f,3.2f);Vector3 up=Vector3.Cross(right.normalized,d)*right.magnitude;
                int start=vertices.Count;vertices.Add(p-right-up);vertices.Add(p+right-up);vertices.Add(p+right+up);vertices.Add(p-right+up);triangles.AddRange(new[]{start,start+2,start+1,start,start+3,start+2});
            }
            var starMesh=new Mesh{name="Distant star field"};starMesh.SetVertices(vertices);starMesh.SetTriangles(triangles,0);starMesh.RecalculateNormals();starMesh.RecalculateBounds();
            generatedAssets.Add(starMesh);
            var starmat=new Material(Shader.Find("Universal Render Pipeline/Unlit"));starmat.SetColor("_BaseColor",new Color(.8f,.87f,1));starmat.SetFloat("_Cull",0);
            generatedAssets.Add(starmat);
            MeshObject("Stars",orbit,starMesh,starmat,Vector3.zero,Vector3.one);orbit.gameObject.SetActive(false);
        }
    }
}

