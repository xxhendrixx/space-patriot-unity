using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
namespace SpacePatriot
{
    // Native renderer for the user's grasspack3js.html blade geometry and wind field.
    public sealed class Grassworks : MonoBehaviour
    {
        public const int TileSize=48, BladesPerTile=12000, MaximumTiles=9;
        public int BladeCount {get;private set;}
        FrontierWorld world;Material material;
        sealed class Tile {public GameObject go;public Mesh mesh;public int blades;}
        readonly Dictionary<Vector2Int,Tile> tiles=new();
        public void Initialize(FrontierWorld owner)
        {
            world=owner;if(world.info.biome!="temperate"){enabled=false;return;}
            material=new Material(Resources.Load<Shader>("Shaders/Grassworks"));
        }
        void Update(){var camera=FrontierGame.Instance?.view;if(camera!=null)UpdateAround(camera.transform.position);}
        public void UpdateAround(Vector3 eye)
        {
            if(world.info.biome!="temperate")return;
            bool visible=eye.y-world.Height(eye.x,eye.z)<100&&new Vector2(eye.x,eye.z).magnitude<2700;
            foreach(var tile in tiles.Values)tile.go.SetActive(visible);if(!visible)return;
            var center=new Vector2Int(Mathf.FloorToInt(eye.x/TileSize),Mathf.FloorToInt(eye.z/TileSize));
            var remove=new List<Vector2Int>();foreach(var key in tiles.Keys)if(Mathf.Abs(key.x-center.x)>1||Mathf.Abs(key.y-center.y)>1)remove.Add(key);
            foreach(var key in remove){BladeCount-=tiles[key].blades;tiles[key].go.SetActive(false);Destroy(tiles[key].go);Destroy(tiles[key].mesh);tiles.Remove(key);}
            // One new tile per frame bounds regeneration cost while flying or teleporting.
            for(int z=-1;z<=1;z++)for(int x=-1;x<=1;x++){var key=center+new Vector2Int(x,z);if(!tiles.ContainsKey(key)){tiles.Add(key,BuildTile(key));return;}}
        }
        public bool CanGrow(float x,float z)
        {
            if(Mathf.Abs(x-140)<320&&Mathf.Abs(z)<275)return false;
            if(Vector2.Distance(new Vector2(x,z),new Vector2(world.outpost.x,world.outpost.z))<80)return false;
            if(Vector2.Distance(new Vector2(x,z),new Vector2(world.grove.x,world.grove.z))<34)return false;
            float y=world.Height(x,z);return y>-2&&Mathf.Abs(world.Height(x+2,z)-y)<1.4f&&Mathf.Abs(world.Height(x,z+2)-y)<1.4f;
        }
        Tile BuildTile(Vector2Int key)
        {
            var random=new System.Random(unchecked(world.info.seed^key.x*73856093^key.y*19349663));
            float R()=>(float)random.NextDouble();
            var positions=new List<Vector3>();var uv=new List<Vector2>();var extras=new List<Vector2>();var colors=new List<Color>();var indices=new List<int>();int count=0;
            for(int blade=0;blade<BladesPerTile;blade++)
            {
                float x=(key.x+R())*TileSize,z=(key.y+R())*TileSize;
                if(!CanGrow(x,z))continue;
                var region=world.terrainFields.Sample(x,z);float seed=R(),angle=R()*Mathf.PI*2;
                float height=(.18f+region.y*.65f)*Mathf.Lerp(.65f,1.35f,R()),width=.028f+region.y*.024f,y=world.Height(x,z)-.025f;
                var color=Color.Lerp(new Color(.39f,.32f,.10f),new Color(.16f,.36f,.075f),region.y);
                int first=positions.Count;
                for(int segment=0;segment<=5;segment++)for(int side=0;side<2;side++)
                {
                    float t=segment/5f,lateral=(side-.5f)*width*Mathf.Pow(1-t,.72f);
                    positions.Add(new Vector3(x+Mathf.Cos(angle)*lateral,y+t*height,z+Mathf.Sin(angle)*lateral));
                    uv.Add(new Vector2(side,t));extras.Add(new Vector2(seed,height));colors.Add(color);
                    if(segment<5&&side==0){int a=first+segment*2;indices.AddRange(new[]{a,a+2,a+1,a+1,a+2,a+3});}
                }
                count++;
            }
            var mesh=new Mesh{name="Grassworks tile "+key,indexFormat=IndexFormat.UInt32};mesh.SetVertices(positions);mesh.SetUVs(0,uv);mesh.SetUVs(1,extras);mesh.SetColors(colors);mesh.SetTriangles(indices,0);mesh.RecalculateBounds();var bounds=mesh.bounds;bounds.Expand(4);mesh.bounds=bounds;
            var go=new GameObject(mesh.name);go.transform.SetParent(transform,false);go.AddComponent<MeshFilter>().sharedMesh=mesh;var renderer=go.AddComponent<MeshRenderer>();renderer.sharedMaterial=material;renderer.shadowCastingMode=ShadowCastingMode.Off;renderer.receiveShadows=true;
            BladeCount+=count;return new Tile{go=go,mesh=mesh,blades=count};
        }
        void OnDestroy(){foreach(var t in tiles.Values)if(t.mesh!=null)Destroy(t.mesh);if(material!=null)Destroy(material);}
    }
}
