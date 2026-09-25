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
    public class FrontierWorld : MonoBehaviour
    {
        public WorldInfo info;
        public List<Place> places=new List<Place>();
        public Vector3 station=new Vector3(0,210,720), outpost=new Vector3(-410,0,380),grove=new Vector3(330,0,250);
        public float Deck=>info.biome=="gas"?125:12;
        Transform content;
        Transform orbit;
        readonly List<UnityEngine.Object> generatedAssets=new List<UnityEngine.Object>();
        public float Height(float x,float z)
        {
            float seed=(info.seed%1000)*.271f;
            float n=Mathf.PerlinNoise(x*.0017f+seed,z*.0017f+seed)*95+Mathf.PerlinNoise(x*.009f+seed,z*.009f)*19;
            float basin=Mathf.SmoothStep(0,1,Mathf.Clamp01((new Vector2(x,z).magnitude-85)/280));
            float mountain=Mathf.SmoothStep(0,1,Mathf.Clamp01((new Vector2(x,z).magnitude-350)/750));
            float ridge=Mathf.Pow(1-Mathf.Abs(Mathf.PerlinNoise(x*.0011f+seed+4,z*.0011f+seed)*2-1),3);
            return -3+n*basin+mountain*ridge*260;
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
            for(int i=0;i<13;i++)
            {
                float angle=i*2.39996f;var p=new Vector3(Mathf.Sin(angle)*330,0,Mathf.Cos(angle)*330);p.y=Height(p.x,p.z);
                var block=Root("Industrial district",content,p);float h=Random.Range(18,65);
                Box("Factory block",block,new Vector3(0,h/2,0),new Vector3(Random.Range(16,30),h,19),Steel,true);
                Box("Roof plant",block,new Vector3(0,h+2,0),new Vector3(12,4,11),Bone);
                for(int side=-1;side<=1;side+=2)for(int row=0;row<(int)h/5;row++)
                Strip(block,new Vector3(0,4+row*5,side*9.55f),new Vector3(11,.38f,.06f),row%3==0?Cyan:WarmLight);
            }
            // One combined static set avoids issuing a draw for every bolt and beam.
            foreach(var renderer in content.GetComponentsInChildren<MeshRenderer>()) renderer.gameObject.isStatic=true;
            StaticBatchingUtility.Combine(content.gameObject);
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
            MeshObject("Weathered terrain",content,mesh,Metal(info.id+" terrain",info.Surface,0,.96f),Vector3.zero,Vector3.one);
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
                var tree=Root("Wind-shaped tree",content,p);Cylinder("Trunk",tree,new Vector3(0,scale,0),.35f,scale*2,Metal("Bark",new Color(.17f,.15f,.12f),0,1));
                var leaves=Metal("Dusty olive foliage",new Color(.18f,.23f,.13f),0,1);
                for(int j=0;j<5;j++)
                { float radius=scale*(1.15f-j*.17f);var crown=HullMesh(new[]{-radius,radius*.35f},new[]{radius*2,.12f},new[]{radius*2,.12f},new[]{0f,0},"Conifer whorl "+scale.ToString("F2")+"/"+j);var top=MeshObject("Irregular needle whorl",tree,crown,leaves,new Vector3(.2f*j,scale*.8f+j*scale*.55f,0),Vector3.one);top.transform.localRotation=Quaternion.Euler(-90,j*37,0); }
            }
        }
        void Port(Vector3 origin,bool small)
        {
            float deck=small?0:Deck;var port=Root(small?"Remote freight pad":"Meridian service port",content,origin);
            float width=small?35:70,depth=small?38:86;
            Box("Elevated landing deck",port,new Vector3(0,deck-.8f,0),new Vector3(width,1.6f,depth),Metal("Deck steel",new Color(.26f,.29f,.28f),.48f,.8f),true);
            for(int side=-1;side<=1;side+=2)
            {
                Box("Deck sill",port,new Vector3(side*(width/2-.4f),deck+.3f,0),new Vector3(.7f,.7f,depth),Orange,true);
                for(int z=0;z<5;z++)
                {
                    float pz=-depth/2+6+z*(depth-12)/4;
                    Box("Foundation pier",port,new Vector3(side*(width/2-5),deck-9,pz),new Vector3(3,18,3),Steel);
                    Strip(port,new Vector3(side*(width/2-4),deck+.05f,pz),new Vector3(.28f,.12f,3),WarmLight);
                }
            }
            for(int i=-2;i<=2;i++)Strip(port,new Vector3(i*4,deck+.04f,0),new Vector3(.12f,.03f,small?24:54),Bone);
            for(int side=-1;side<=1;side+=2)
            {
                Strip(port,new Vector3(side*9,deck+.06f,3),new Vector3(.28f,.05f,23),Orange);
                Strip(port,new Vector3(side*5,deck+.06f,-9),new Vector3(8,.05f,.3f),Orange);
            }
            if(!small)
            {
                for(int i=0;i<4;i++)
                {
                    float z=-35+i*17;
                    for(int side=-1;side<=1;side+=2)
                    {
                        Box("Gantry column",port,new Vector3(side*30,deck+11,z),new Vector3(1.8f,22,2.2f),Steel,true);
                        Beam(port,new Vector3(side*30,deck+16,z),new Vector3(side*21,deck+23,z),1.1f,Steel);
                        Box("Maintenance gallery",port,new Vector3(side*28,deck+9,z),new Vector3(5,.8f,15),Bone);
                    }
                    Box("Roof truss",port,new Vector3(0,deck+24,z),new Vector3(61,1.5f,1.8f),Steel);
                    Strip(port,new Vector3(0,deck+23,z),new Vector3(15,.15f,.65f),WarmLight);
                    var lamp=new GameObject("Gantry work light");lamp.transform.SetParent(port,false);lamp.transform.localPosition=new Vector3(0,deck+20,z);
                    var light=lamp.AddComponent<Light>();light.type=LightType.Point;light.range=38;light.intensity=400;light.color=new Color(1,.81f,.56f);light.shadows=LightShadows.None;
                }
                Box("Corrugated roof",port,new Vector3(0,deck+25,-6),new Vector3(66,.5f,69),Metal("Roof oxide",new Color(.27f,.29f,.28f),.65f,.83f));
                Box("Rear operations wall",port,new Vector3(0,deck+6,-41),new Vector3(67,12,1),Steel,true);
                Box("Operations office",port,new Vector3(23,deck+2,-29),new Vector3(9,4,13),Bone,true);
                Label(port,"MERIDIAN  /  PORT 07",new Vector3(0,deck+10,-39.8f),.47f,new Color(.76f,.77f,.65f),new Vector3(0,180,0));
                Label(port,"AUTHORIZED CREW ONLY",new Vector3(18,deck+3,-21.9f),.18f,new Color(.7f,.7f,.62f),new Vector3(0,180,0));
                for(int i=0;i<8;i++)Crate(port,new Vector3(-24+(i%3)*2.6f,deck,-31+(i/3)*4),i%2);
                for(int i=0;i<4;i++)Cylinder("Fuel reservoir",port,new Vector3(27,deck+3,12+i*4),1.5f,6,Bone);
                Terminal(port,new Vector3(-9,deck,-21),"OPERATIONS",Cyan);
                Terminal(port,new Vector3(9,deck,-21),"FREIGHT",WarmLight);
                Terminal(port,new Vector3(20,deck,16),"REACTOR",Glow("Reactor amber",new Color(.8f,.48f,.16f)));
                places.Add(new Place("Operations terminal","terminal",origin+new Vector3(-9,deck,-21),4));
                places.Add(new Place("Cargo receiving","delivery",origin+new Vector3(9,deck,-21),4));
                places.Add(new Place("City power bus","power",origin+new Vector3(20,deck,16),4));
            }
            else
            {
                Box("Field shelter",port,new Vector3(-12,3,-10),new Vector3(8,6,10),Bone,true);
                Terminal(port,new Vector3(11,0,-9),"FREIGHT / REMOTE",Cyan);
                places.Add(new Place("Remote freight office","delivery",origin+new Vector3(11,0,-9),5));
            }
            places.Add(new Place(small?"Remote landing pad":"Port 07 landing pad","landing",origin+new Vector3(0,deck+2.65f,0),small?16:23));
        }
        void OrbitalStation()
        {
            var r=Root("Orbital traffic platform",content,station);var mat=Metal("Station titanium",new Color(.47f,.49f,.44f),.65f,.65f);
            Box("Dock platform",r,new Vector3(0,-1.5f,0),new Vector3(54,3,62),Steel,true);
            Box("Pressure hall",r,new Vector3(0,7,26),new Vector3(45,16,10),mat,true);
            Label(r,"TRAFFIC CONTROL / 04",new Vector3(0,12,20.8f),.68f,new Color(.75f,.79f,.7f),new Vector3(0,180,0));
            for(int side=-1;side<=1;side+=2)
            {
                Box("Pylon",r,new Vector3(side*24,6,0),new Vector3(2,16,55),mat,true);
                Strip(r,new Vector3(side*21,.04f,0),new Vector3(.3f,.09f,44),Cyan);
                Beam(r,new Vector3(side*20,-2,20),new Vector3(side*48,-30,0),2,Steel);
                Box("Radiator bank",r,new Vector3(side*48,-28,0),new Vector3(23,.7f,60),Dark);
                for(int i=0;i<7;i++)Box("Radiator rib",r,new Vector3(side*48,-27.5f,-27+i*9),new Vector3(22,.5f,.3f),Bone);
            }
            Cylinder("Antenna mast",r,new Vector3(0,30,26),.6f,40,Steel);
            Terminal(r,new Vector3(10,0,17),"TRAFFIC RECORDS",Cyan);
            places.Add(new Place("Station records","station",station+new Vector3(10,0,17),5));
            places.Add(new Place("Traffic station landing pad","landing",station+new Vector3(0,2.65f,-3),21));
        }
        public float SurfaceAt(Vector3 pos)
        {
            if(Mathf.Abs(pos.x)<35&&Mathf.Abs(pos.z)<43)return Deck;
            if(Mathf.Abs(pos.x-outpost.x)<17.5f&&Mathf.Abs(pos.z-outpost.z)<19)return outpost.y;
            if(Mathf.Abs(pos.x-station.x)<27&&Mathf.Abs(pos.z-station.z)<31)return station.y;
            if(Mathf.Abs(pos.x-grove.x)<25&&Mathf.Abs(pos.z-grove.z)<15)return grove.y+1;
            return Height(pos.x,pos.z);
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

