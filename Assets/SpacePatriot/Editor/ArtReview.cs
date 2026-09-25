using System.IO;
using UnityEngine;
using UnityEditor;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;
public static class ArtReview
{
    public static void Capture()
    {
        Directory.CreateDirectory("ArtDirection/Renders");var root=new GameObject("Art review stage");root.transform.position=new Vector3(30000,5000,0);
        bool fog=RenderSettings.fog;var sky=RenderSettings.ambientSkyColor;var equator=RenderSettings.ambientEquatorColor;var ground=RenderSettings.ambientGroundColor;
        RenderSettings.fog=false;RenderSettings.ambientSkyColor=new Color(.65f,.71f,.79f);RenderSettings.ambientEquatorColor=new Color(.46f,.48f,.5f);RenderSettings.ambientGroundColor=new Color(.27f,.25f,.22f);
        var camera=new GameObject("Matched concept camera").AddComponent<Camera>();camera.transform.SetParent(root.transform,false);camera.cullingMask=1<<30;camera.nearClipPlane=.03f;camera.farClipPlane=500;camera.fieldOfView=58.7f;camera.aspect=1.6f;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.45f,.52f,.56f);
        var key=new GameObject("Studio key").AddComponent<Light>();key.transform.SetParent(root.transform,false);key.type=LightType.Directional;key.transform.localRotation=Quaternion.Euler(35,-25,0);key.intensity=2;key.cullingMask=1<<30;key.shadows=LightShadows.Soft;key.shadowBias=.03f;key.shadowNormalBias=.12f;
        try{
            foreach(var model in new[]{"cabin-0","cabin-7","rifle","sidearm","refit-0","refit-2","refit-4","refit-5","refit-7","refit-9"}){
                var go=Object.Instantiate(Resources.Load<GameObject>("OriginalShips/"+model),root.transform);foreach(var tr in go.GetComponentsInChildren<Transform>())tr.gameObject.layer=30;
                camera.transform.localRotation=Quaternion.identity;
                if(model.StartsWith("cabin")){
                    for(int i=0;i<4;i++){var lamp=new GameObject("Task light").AddComponent<Light>();lamp.transform.SetParent(go.transform,false);lamp.transform.localPosition=new Vector3(0,.65f,.3f-i*2.2f);lamp.type=LightType.Point;lamp.range=6;lamp.intensity=.8f;lamp.color=new Color(1,.87f,.68f);lamp.cullingMask=1<<30;}
                    camera.fieldOfView=58.7f;camera.transform.localPosition=Vector3.zero;Save(camera,model+"-helm");camera.transform.localPosition=new Vector3(.3f,0,-1.1f);camera.transform.localRotation=Quaternion.Euler(0,180,0);Save(camera,model+"-aft");
                }else{
                    camera.fieldOfView=40;Bounds b=new Bounds(go.transform.position,Vector3.zero);foreach(var r in go.GetComponentsInChildren<Renderer>())b.Encapsulate(r.bounds);float size=Mathf.Max(b.size.x,b.size.y,b.size.z);camera.transform.position=b.center+new Vector3(-.85f,.55f,.95f)*size;camera.transform.LookAt(b.center);Save(camera,model);
                    camera.orthographic=true;camera.orthographicSize=size*.58f;camera.transform.position=b.center+Vector3.up*size*2;camera.transform.LookAt(b.center,Vector3.forward);Save(camera,model+"-plan");camera.orthographic=false;
                }
                Object.DestroyImmediate(go);
            }
        }finally{RenderSettings.fog=fog;RenderSettings.ambientSkyColor=sky;RenderSettings.ambientEquatorColor=equator;RenderSettings.ambientGroundColor=ground;Object.DestroyImmediate(root);}
        File.WriteAllText("Validation/art-review-status.txt","PASS: actual Unity meshes rendered; visual comparison still required.");
    }
    static void Save(Camera c,string id)
    {
        var rt=new RenderTexture(1600,1000,24);var prev=RenderTexture.active;var previousTarget=c.targetTexture;var previousRect=c.rect;float previousAspect=c.aspect;c.rect=new Rect(0,0,1,1);c.aspect=1.6f;c.targetTexture=rt;
        try{RenderPipeline.SubmitRenderRequest(c,new UnityEngine.Rendering.Universal.UniversalRenderPipeline.SingleCameraRequest{destination=rt});RenderTexture.active=rt;var tx=new Texture2D(1600,1000,TextureFormat.RGB24,false);tx.ReadPixels(new Rect(0,0,1600,1000),0,0);tx.Apply();File.WriteAllBytes("ArtDirection/Renders/"+id+".png",tx.EncodeToPNG());Object.DestroyImmediate(tx);}
        finally{c.targetTexture=previousTarget;c.rect=previousRect;c.aspect=previousAspect;RenderTexture.active=prev;Object.DestroyImmediate(rt);}
    }
}

