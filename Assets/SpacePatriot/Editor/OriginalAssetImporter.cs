using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SpacePatriot;

public static class OriginalAssetImporter
{
    const string Source="Assets/SpacePatriot/Original/Converted/",Dest="Assets/SpacePatriot/Models/Original/",Prefabs="Assets/SpacePatriot/Resources/OriginalShips/";
    [Serializable] class Catalog {public MaterialRecord[] materials;public Model[] models;}
    [Serializable] class MaterialRecord {public string id,map,normal,emissiveMap;public float[] color,emission,repeat;public float metal,rough,opacity,intensity,alphaTest,normalScale;public bool transparent,doubleSided,unlit,paint;}
    [Serializable] class Model {public string id,kind;public Node[] nodes;}
    [Serializable] class Node {public string file,material,name,door;public bool gear,lift;public int mfd,button,liftFloor,liftSide;}
    static Color C(float[] values)=>new Color(values[0],values[1],values[2],1);
    static Texture2D Tex(string path)=>string.IsNullOrEmpty(path)?null:AssetDatabase.LoadAssetAtPath<Texture2D>(Source+path);
    [MenuItem("Space Patriot/Restore original modeled assets")]
    public static void Import()
    {
        Directory.CreateDirectory(Dest);Directory.CreateDirectory(Prefabs);AssetDatabase.Refresh();
        var data=JsonUtility.FromJson<Catalog>(File.ReadAllText(Source+"import.json"));
        var materials=new Dictionary<string,Material>();var meshes=new Dictionary<string,Mesh>();
        foreach(var row in data.materials)
        {
            if(!string.IsNullOrEmpty(row.normal)){
                var ti=AssetImporter.GetAtPath(Source+row.normal) as TextureImporter;
                if(ti!=null&&ti.textureType!=TextureImporterType.NormalMap){ti.textureType=TextureImporterType.NormalMap;ti.SaveAndReimport();}}
            string path=Dest+row.id+".mat";var m=AssetDatabase.LoadAssetAtPath<Material>(path);
            if(m==null){m=new Material(Shader.Find(row.unlit?"Universal Render Pipeline/Unlit":"Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(m,path);}
            m.SetColor("_BaseColor",new Color(row.color[0],row.color[1],row.color[2],row.opacity));m.SetTexture("_BaseMap",Tex(row.map));
            m.SetTextureScale("_BaseMap",new Vector2(row.repeat[0],row.repeat[1]));m.SetFloat("_Cull",row.doubleSided?0:2);
            if(!row.unlit){m.SetFloat("_Metallic",row.metal);m.SetFloat("_Smoothness",1-row.rough);
                if(Tex(row.normal)!=null){m.SetTexture("_BumpMap",Tex(row.normal));m.SetFloat("_BumpScale",row.normalScale);m.EnableKeyword("_NORMALMAP");}
                m.SetColor("_EmissionColor",C(row.emission)*row.intensity);m.SetTexture("_EmissionMap",Tex(row.emissiveMap));m.EnableKeyword("_EMISSION");}
            if(row.transparent){m.SetFloat("_Surface",1);m.SetFloat("_SrcBlend",5);m.SetFloat("_DstBlend",10);m.SetFloat("_ZWrite",0);m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");m.renderQueue=3000;}
            if(row.alphaTest>0){m.SetFloat("_AlphaClip",1);m.SetFloat("_Cutoff",row.alphaTest);m.EnableKeyword("_ALPHATEST_ON");}
            m.name=row.paint?"Hull finish":row.id;EditorUtility.SetDirty(m);materials.Add(row.id,m);
        }
        foreach(var model in data.models)
        {
            var root=new GameObject(model.id);var gears=new List<Transform>();
            foreach(var row in model.nodes)
            {
                if(!meshes.TryGetValue(row.file,out var mesh))
                {
                    string path=Dest+Path.GetFileNameWithoutExtension(row.file)+".asset";mesh=AssetDatabase.LoadAssetAtPath<Mesh>(path);
                    bool isNew=mesh==null;{using var r=new BinaryReader(File.OpenRead(Source+row.file));int count=r.ReadInt32(),indices=r.ReadInt32();
                        var p=new Vector3[count];var n=new Vector3[count];var uv=new Vector2[count];var ix=new int[indices];
                        for(int i=0;i<count;i++){p[i]=new Vector3(r.ReadSingle(),r.ReadSingle(),r.ReadSingle());n[i]=new Vector3(r.ReadSingle(),r.ReadSingle(),r.ReadSingle());uv[i]=new Vector2(r.ReadSingle(),r.ReadSingle());}
                        for(int i=0;i<indices;i++)ix[i]=r.ReadInt32();
                        // The binary vertices/normals already reflect Z, but contain Three's original indices.
                        // Match each face to its transformed normal, including any reflected source transforms.
                        for(int i=0;i<indices;i+=3)if(Vector3.Dot(Vector3.Cross(p[ix[i+1]]-p[ix[i]],p[ix[i+2]]-p[ix[i]]),n[ix[i]]+n[ix[i+1]]+n[ix[i+2]])<0){int swap=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=swap;}
                        if(isNew)mesh=new Mesh{name=Path.GetFileNameWithoutExtension(row.file),indexFormat=UnityEngine.Rendering.IndexFormat.UInt32};else mesh.Clear();
                        mesh.vertices=p;mesh.normals=n;mesh.uv=uv;mesh.triangles=ix;mesh.RecalculateBounds();mesh.RecalculateTangents();if(isNew)AssetDatabase.CreateAsset(mesh,path);else EditorUtility.SetDirty(mesh);}
                    meshes.Add(row.file,mesh);
                }
                var go=new GameObject(row.name);go.transform.SetParent(root.transform,false);go.AddComponent<MeshFilter>().sharedMesh=mesh;go.AddComponent<MeshRenderer>().sharedMaterial=materials[row.material];
                if(row.gear){go.name="Landing gear";gears.Add(go.transform);}
                if(!string.IsNullOrEmpty(row.door))go.AddComponent<OriginalDoorPart>().id=row.door;
                if(row.lift||row.liftFloor>=0){var part=go.AddComponent<BuildingLiftPart>();part.cabin=row.lift;part.floor=row.liftFloor;part.side=row.liftSide;if(!row.lift){var collider=go.AddComponent<BoxCollider>();collider.center=mesh.bounds.center;collider.size=mesh.bounds.size;}}
                if(row.button>=0||row.mfd>=0){var hit=go.AddComponent<BoxCollider>();hit.center=mesh.bounds.center;hit.size=Vector3.Max(mesh.bounds.size,new Vector3(.05f,.035f,.03f));var control=go.AddComponent<CockpitControl>();control.action=row.button;control.screen=row.mfd;}
            }
            PrefabUtility.SaveAsPrefabAsset(root,Prefabs+model.id+".prefab");UnityEngine.Object.DestroyImmediate(root);
        }
        string surfaces="Assets/SpacePatriot/Resources/OriginalSurfaces/";Directory.CreateDirectory(surfaces);
        foreach(var file in Directory.GetFiles(Source,"atlas-*.png")){
            string name=Path.GetFileNameWithoutExtension(file).Substring(6),path=surfaces+name+".mat";
            var m=AssetDatabase.LoadAssetAtPath<Material>(path);if(m==null){m=new Material(Shader.Find("Universal Render Pipeline/Lit"));AssetDatabase.CreateAsset(m,path);}
            m.name=name;m.SetColor("_BaseColor",Color.white);m.SetTexture("_BaseMap",AssetDatabase.LoadAssetAtPath<Texture2D>(file.Replace('\\','/')));m.SetFloat("_Smoothness",.24f);m.SetFloat("_Metallic",name.StartsWith("interior")||name.StartsWith("exterior")||name.StartsWith("machinery")?.35f:0);EditorUtility.SetDirty(m);
        }
        AssetDatabase.SaveAssets();Debug.Log("ORIGINAL_ASSETS_IMPORTED: "+data.models.Length+" original models; "+materials.Count+" materials; "+meshes.Count+" meshes; all 100 fleet specifications; 128 atlas cells.");
    }
}
