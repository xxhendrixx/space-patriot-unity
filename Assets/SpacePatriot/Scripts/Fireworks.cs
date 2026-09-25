using UnityEngine;
using UnityEngine.Rendering;
namespace SpacePatriot
{
    // Fireworks flame lifecycle, taper, buoyancy, turbulence and heat gradient.
    // Emitters are causal, fixed in world space, finite, and recycled in six slots.
    public sealed class Fireworks : MonoBehaviour
    {
        public const int MaximumEmitters=6,ParticlesPerEmitter=240;
        sealed class Emitter {public GameObject go;public MeshRenderer renderer;public float end;}
        readonly Emitter[] emitters=new Emitter[MaximumEmitters];int cursor;Mesh mesh;Material material;
        MaterialPropertyBlock properties;
        public int ActiveCount {get {int n=0;foreach(var e in emitters)if(e!=null&&e.go.activeSelf)n++;return n;}}
        void Awake()
        {
            properties=new MaterialPropertyBlock();
            var random=new System.Random(7149);float R()=>(float)random.NextDouble();
            var p=new Vector3[ParticlesPerEmitter*4];var uv=new Vector2[p.Length];var data=new Vector4[p.Length];var ix=new int[ParticlesPerEmitter*6];
            for(int i=0;i<ParticlesPerEmitter;i++){
                Vector4 seed=new Vector4(R(),.8f+R()*.9f,R(),Mathf.Sqrt(R()));
                for(int j=0;j<4;j++){uv[i*4+j]=new Vector2(j==0||j==3?-.5f:.5f,j<2?-.5f:.5f);data[i*4+j]=seed;}
                int k=i*4,q=i*6;ix[q]=k;ix[q+1]=k+1;ix[q+2]=k+2;ix[q+3]=k;ix[q+4]=k+2;ix[q+5]=k+3;
            }
            mesh=new Mesh{name="Fireworks flame field"};mesh.vertices=p;mesh.uv=uv;mesh.SetUVs(1,data);mesh.triangles=ix;mesh.bounds=new Bounds(Vector3.up*5,new Vector3(24,20,24));
            material=new Material(Resources.Load<Shader>("Shaders/Fireworks"));
        }
        public void Ignite(Vector3 point,float duration=8,float scale=1)
        {
            int slot=cursor++%MaximumEmitters;var e=emitters[slot];
            if(e==null){var go=new GameObject("Fireworks / fuel ignition");go.transform.SetParent(transform,false);go.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=ShadowCastingMode.Off;e=emitters[slot]=new Emitter{go=go,renderer=renderer};}
            e.go.transform.position=point;e.go.SetActive(true);e.end=Time.time+Mathf.Clamp(duration,.5f,12);
            properties.Clear();properties.SetFloat("_Start",Time.time);properties.SetFloat("_End",e.end);properties.SetFloat("_Scale",Mathf.Clamp(scale,.3f,2));e.renderer.SetPropertyBlock(properties);
        }
        void Update(){foreach(var e in emitters)if(e!=null&&e.go.activeSelf&&Time.time>e.end)e.go.SetActive(false);}
        void OnDestroy(){if(mesh!=null)Destroy(mesh);if(material!=null)Destroy(material);}
    }
}
