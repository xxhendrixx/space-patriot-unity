using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEditor;
using SpacePatriot;
using Object=UnityEngine.Object;
public static class EngineRestorationValidation
{
    static void Check(bool ok,string message,List<string> lines){if(!ok)throw new Exception(message);lines.Add("PASS: "+message);}
    public static void Streaming()
    {
        var g=FrontierGame.Instance;if(g==null)throw new Exception("Enter Play mode first");var lines=new List<string>();
        var focus=g.ship.position+new Vector3(200,0,0);focus.y=g.world.Height(focus.x,focus.z)+2;
        g.world.StreamSurface(focus,true);var patch=GameObject.Find("Worldworks / moving terrain patch");var mesh=patch?patch.GetComponent<MeshFilter>()?.sharedMesh:null;
        Check(mesh!=null&&mesh.vertexCount==193*193,"On-foot streamed terrain has 193 x 193 samples",lines);
        Check(Mathf.Abs(patch.transform.localPosition.x-focus.x)<.01f&&Mathf.Abs(patch.transform.localPosition.z-focus.z)<.01f,"Terrain patch recenters on its requested player position",lines);
        int center=(mesh.vertexCount/2);float renderedHeight=patch.transform.position.y+mesh.vertices[center].y;
        Check(Mathf.Abs(renderedHeight-(g.world.Height(focus.x,focus.z)+.035f))<.02f,"Patch center follows the active Worldworks height query",lines);
        Check(patch.GetComponent<MeshCollider>()==null,"Streamed patch renders over the existing planet height/collision system",lines);
        Directory.CreateDirectory("Validation");File.WriteAllLines("Validation/world-streaming.txt",lines);Debug.Log("WORLD_STREAMING_PASS "+lines.Count);
    }
    public static void Run()
    {
        var g=FrontierGame.Instance;if(g==null)throw new Exception("Enter Play mode first");var lines=new List<string>();
        int worlds=0;foreach(var w in g.worlds){if(w.biome=="gas")continue;var field=new WorldworksTerrain(w.id);Check(field.resolution==129&&field.size==5760,"Original terrain field loaded: "+w.id,lines);worlds++;}
        for(int i=0;i<8;i++)g.combustion.Ignite(g.ship.position+Vector3.forward*30);Check(g.combustion.ActiveCount==6,"Fireworks recycles six causal emitter slots",lines);
        Check(worlds==14,"14 solid worlds use compiled original engine fields",lines);
        var ground=GameObject.Find("Continuous spherical terrain").GetComponent<MeshFilter>().sharedMesh;
        var v=ground.vertices;var ix=ground.triangles;var edges=new Dictionary<ulong,int>();
        void Edge(int a,int b){uint lo=(uint)Math.Min(a,b),hi=(uint)Math.Max(a,b);ulong k=((ulong)lo<<32)|hi;edges[k]=edges.GetValueOrDefault(k)+1;}
        for(int i=0;i<ix.Length;i+=3){Edge(ix[i],ix[i+1]);Edge(ix[i+1],ix[i+2]);Edge(ix[i+2],ix[i]);}
        foreach(int n in edges.Values)if(n!=2)throw new Exception("Open planetary edge");
        Check(true,"Planet is a closed continuous mesh; every edge belongs to two triangles",lines);
        float worst=0;for(int i=0;i<256*6*115;i+=117){int k=i/3*3;Vector3 a=v[ix[k]],b=v[ix[k+1]],c=v[ix[k+2]];var p=a*.21f+b*.33f+c*.46f;worst=Mathf.Max(worst,Mathf.Abs(g.world.Height(p.x,p.z)-p.y));}
        Check(worst<.025f,"Rendered terrain / walking height agreement: "+worst.ToString("F5")+" m",lines);
        Vector3 meadow=FindMeadow(g.world);for(int i=0;i<10;i++)g.world.grass.UpdateAround(meadow);
        Check(g.world.grass.BladeCount>1000&&g.world.grass.BladeCount<=Grassworks.MaximumTiles*Grassworks.BladesPerTile,"Grassworks grows bounded terrain-rooted blades: "+g.world.grass.BladeCount,lines);
        g.world.StreamSurface(meadow,true);var streamed=GameObject.Find("Worldworks / moving terrain patch");var streamedMesh=streamed?streamed.GetComponent<MeshFilter>()?.sharedMesh:null;
        Check(streamedMesh!=null&&streamedMesh.vertexCount==193*193,"Worldworks streams a 12 km walking terrain patch around the player: "+(streamedMesh?streamedMesh.vertexCount:0)+" vertices",lines);
        int blades=g.world.grass.BladeCount;g.world.grass.UpdateAround(meadow);Check(blades==g.world.grass.BladeCount,"Grass tiles stay stable while observer remains in same tile",lines);
        g.world.grass.UpdateAround(meadow+Vector3.up*300);bool hidden=true;foreach(var r in g.world.grass.GetComponentsInChildren<Renderer>(true))hidden&=!r.gameObject.activeSelf;Check(hidden,"Grass is culled from orbital altitude",lines);
        int events=g.effects.EffectEvents;g.effects.Impact(meadow,Vector3.up,false,1,912345);g.effects.Impact(meadow,Vector3.up,false,1,912345);Check(g.effects.EffectEvents==events+1,"Spellworks suppresses duplicate event IDs",lines);
        int before=g.effects.Emitted;g.effects.Impact(meadow,Vector3.up,true,2);Check(g.effects.Emitted-before==75,"Destruction emits original 65 flame / 10 smoke burst",lines);
        for(int i=0;i<3000;i++)g.effects.Emit(meadow,Vector3.up,Color.white,.1f,.02f);g.effects.Flush();
        int vertices=0;foreach(var filter in g.effects.GetComponentsInChildren<MeshFilter>())vertices+=filter.sharedMesh.vertexCount;
        Check(vertices==(Spellworks.Capacity+Spellworks.SmokeCapacity)*4,"Spellworks ring remains bounded after overflow",lines);
        var climate=new GameObject("Weatherworks validation").AddComponent<Weatherworks>();climate.Wetness=.32f;climate.Rain=.45f;climate.Temperature=12;climate.Step(.1f);
        Check(Mathf.Abs(climate.Wetness-(.32f+.1f*(.45f*.025f-.55f*(.0015f+12*.00023f))))<.000001f,"Weatherworks wetness matches original equation",lines);Object.DestroyImmediate(climate.gameObject);
        Check(Mathf.Abs(Oceanworks.WaveHeight(new Vector2(10,20),3)-Oceanworks.WaveHeight(new Vector2(10,20),4))>.0001f,"Oceanworks directional wave field evolves with time",lines);
        for(int f=0;f<10;f++){var prefab=Resources.Load<GameObject>("OriginalShips/refit-"+f);Check(prefab!=null&&prefab.GetComponentsInChildren<MeshRenderer>().Length<=30,"Refit chassis "+f+" exists within 30 material batches",lines);}
        Directory.CreateDirectory("Validation");File.WriteAllLines("Validation/engine-restoration.txt",lines);Debug.Log("ENGINE_RESTORATION_PASS "+lines.Count);
    }
    public static Vector3 FindMeadow(FrontierWorld w)
    {
        for(int z=350;z<1100;z+=48)for(int x=460;x<1200;x+=48)if(w.grass.CanGrow(x,z))return new Vector3(x,w.Height(x,z)+2,z);
        throw new Exception("No valid meadow near the port");
    }
    static Texture2D Render(Camera camera,int width,int height)
    {
        var target=new RenderTexture(width,height,24);var previous=camera.targetTexture;var active=RenderTexture.active;var rect=camera.rect;camera.rect=new Rect(0,0,1,1);camera.targetTexture=target;UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(camera,new UnityEngine.Rendering.Universal.UniversalRenderPipeline.SingleCameraRequest{destination=target});RenderTexture.active=target;
        var image=new Texture2D(width,height,TextureFormat.RGB24,false);image.ReadPixels(new Rect(0,0,width,height),0,0);image.Apply();camera.targetTexture=previous;camera.rect=rect;RenderTexture.active=active;Object.DestroyImmediate(target);return image;
    }
    static void Save(Camera c,string file){var image=Render(c,1440,900);File.WriteAllBytes("Validation/"+file,ImageConversion.EncodeToPNG(image));Object.DestroyImmediate(image);}
    public static void Fleet()
    {
        Directory.CreateDirectory("Validation");var root=new GameObject("Refit validation studio");root.transform.position=new Vector3(25000,6000,0);
        var camera=new GameObject("Studio camera").AddComponent<Camera>();camera.transform.SetParent(root.transform,false);camera.cullingMask=1<<31;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.12f,.14f,.16f);camera.fieldOfView=42;camera.aspect=1.6f;camera.nearClipPlane=.05f;camera.farClipPlane=1500;
        var light=new GameObject("Key light").AddComponent<Light>();light.type=LightType.Directional;light.intensity=2;light.color=new Color(1,.91f,.79f);light.cullingMask=1<<31;light.transform.SetParent(root.transform,false);light.transform.rotation=Quaternion.Euler(35,-20,0);
        var fill=new GameObject("Fill light").AddComponent<Light>();fill.type=LightType.Directional;fill.intensity=1;fill.color=new Color(.64f,.76f,1);fill.cullingMask=1<<31;fill.transform.SetParent(root.transform,false);fill.transform.rotation=Quaternion.Euler(20,160,0);
        var sheet=new Texture2D(1440,1800,TextureFormat.RGB24,false);bool fog=RenderSettings.fog;RenderSettings.fog=false;
        try{for(int f=0;f<10;f++){
            var go=Object.Instantiate(Resources.Load<GameObject>("OriginalShips/refit-"+f),root.transform);foreach(var t in go.GetComponentsInChildren<Transform>())t.gameObject.layer=31;
            float l=ShipSpec.Fleet[f*10].length,w=ShipSpec.Fleet[f*10].width,h=ShipSpec.Fleet[f*10].height,extent=Mathf.Max(l,w);
            camera.transform.localPosition=new Vector3(-extent*.80f,extent*.57f,extent*.86f);camera.transform.LookAt(root.transform.position+Vector3.up*h*.04f);
            var image=Render(camera,720,360);sheet.SetPixels(f%2*720,(4-f/2)*360,720,360,image.GetPixels());if(f==0||f==2||f==5||f==9)Save(camera,"refit-"+f+".png");Object.DestroyImmediate(image);Object.DestroyImmediate(go);
        }sheet.Apply();File.WriteAllBytes("Validation/refit-fleet.png",ImageConversion.EncodeToPNG(sheet));}
        finally{RenderSettings.fog=fog;Object.DestroyImmediate(sheet);Object.DestroyImmediate(root);}
    }
    public static void WorldViews()
    {
        var g=FrontierGame.Instance;var camera=new GameObject("Engine restoration camera").AddComponent<Camera>();camera.fieldOfView=60;camera.aspect=1.6f;camera.nearClipPlane=.1f;camera.farClipPlane=90000;camera.clearFlags=CameraClearFlags.Skybox;bool fog=RenderSettings.fog;float fogDensity=RenderSettings.fogDensity;
        try{
            Vector3 p=FindMeadow(g.world);for(int i=0;i<10;i++)g.world.grass.UpdateAround(p);var blades=g.world.grass.GetComponentsInChildren<MeshFilter>();foreach(var blade in blades)if(blade.sharedMesh.vertexCount>120){var verts=blade.sharedMesh.vertices;p=verts[(verts.Length/24)*12];break;}
            camera.transform.position=p+new Vector3(0,1.25f,-2.2f);camera.transform.LookAt(p+Vector3.up*.3f);Save(camera,"grassworks-restored.png");
            camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.002f,.004f,.008f);camera.transform.position=new Vector3(17000,13000,22000);camera.transform.LookAt(g.world.PlanetCenter);RenderSettings.fog=false;RenderSettings.fogDensity=0;Save(camera,"continuous-planet.png");
        }finally{RenderSettings.fog=fog;RenderSettings.fogDensity=fogDensity;Object.DestroyImmediate(camera.gameObject);}
    }
}
