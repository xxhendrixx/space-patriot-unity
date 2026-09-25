using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

// Imports the complete textured Kestrel as a review prefab in its own art lab.
public static class LocalShipImporter
{
    const string Root = "Assets/SpacePatriot/ArtLab/KestrelK017";
    const string ActiveBuild = "ArtDirection/Generated/KestrelK017/active-build.txt";

    [MenuItem("Space Patriot/Art lab/Import latest baked Kestrel")]
    public static void ImportLatest()
    {
        if (!File.Exists(ActiveBuild)) throw new FileNotFoundException("Build the Kestrel component kit first.", ActiveBuild);
        string buildId = File.ReadAllText(ActiveBuild).Trim();
        string source = "ArtDirection/Generated/KestrelK017/" + buildId;
        if (!Regex.IsMatch(buildId, "^[A-Za-z0-9_-]{1,64}$")) throw new InvalidDataException("Invalid active Kestrel build id.");
        var report = JsonUtility.FromJson<BuildReport>(File.ReadAllText(source + "/assembly-report.json"));
        if (report == null || report.parts == null || report.parts.Length != 4) throw new InvalidDataException("Kestrel build report is incomplete.");

        string destination = Root + "/" + buildId;
        Directory.CreateDirectory(destination + "/Textures");
        Copy(source + "/Kestrel_K017.fbx", destination + "/Kestrel_K017.fbx");
        foreach (string name in new[] { "Kestrel_BaseColor.png", "Kestrel_Normal.png", "Kestrel_MetallicSmoothness.png" })
            Copy(source + "/Textures/" + name, destination + "/Textures/" + name);
        AssetDatabase.ImportAsset(destination + "/Textures/Kestrel_BaseColor.png", ImportAssetOptions.ForceSynchronousImport);
        AssetDatabase.ImportAsset(destination + "/Textures/Kestrel_Normal.png", ImportAssetOptions.ForceSynchronousImport);
        AssetDatabase.ImportAsset(destination + "/Textures/Kestrel_MetallicSmoothness.png", ImportAssetOptions.ForceSynchronousImport);

        var baseImporter = (TextureImporter)AssetImporter.GetAtPath(destination + "/Textures/Kestrel_BaseColor.png");
        baseImporter.sRGBTexture = true; baseImporter.textureCompression = TextureImporterCompression.CompressedHQ; baseImporter.SaveAndReimport();
        var normalImporter = (TextureImporter)AssetImporter.GetAtPath(destination + "/Textures/Kestrel_Normal.png");
        normalImporter.textureType = TextureImporterType.NormalMap; normalImporter.textureCompression = TextureImporterCompression.CompressedHQ; normalImporter.SaveAndReimport();
        var metalImporter = (TextureImporter)AssetImporter.GetAtPath(destination + "/Textures/Kestrel_MetallicSmoothness.png");
        metalImporter.sRGBTexture = false; metalImporter.textureCompression = TextureImporterCompression.CompressedHQ; metalImporter.SaveAndReimport();

        string fbxPath = destination + "/Kestrel_K017.fbx";
        AssetDatabase.ImportAsset(fbxPath, ImportAssetOptions.ForceSynchronousImport);
        var modelImporter = (ModelImporter)AssetImporter.GetAtPath(fbxPath);
        modelImporter.materialImportMode = ModelImporterMaterialImportMode.None;
        modelImporter.importAnimation = false;
        modelImporter.importNormals = ModelImporterNormals.Import;
        modelImporter.bakeAxisConversion = true;
        modelImporter.meshCompression = ModelImporterMeshCompression.Off;
        modelImporter.SaveAndReimport();
        var model = AssetDatabase.LoadAssetAtPath<GameObject>(fbxPath);

        var materialPath = destination + "/Kestrel_BakedAtlas.mat";
        var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
        if (material == null)
        {
            material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            AssetDatabase.CreateAsset(material, materialPath);
        }
        material.name = "Kestrel / Baked colour and detail atlas";
        material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(destination + "/Textures/Kestrel_BaseColor.png"));
        material.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(destination + "/Textures/Kestrel_Normal.png"));
        material.SetTexture("_MetallicGlossMap", AssetDatabase.LoadAssetAtPath<Texture2D>(destination + "/Textures/Kestrel_MetallicSmoothness.png"));
        material.SetFloat("_Metallic", .45f); material.SetFloat("_Smoothness", 1f); material.SetFloat("_BumpScale", .8f);
        material.EnableKeyword("_NORMALMAP"); material.EnableKeyword("_METALLICSPECGLOSSMAP");
        EditorUtility.SetDirty(material);

        var root = new GameObject("Kestrel K-017 / baked local build");
        try
        {
            var instance = (GameObject)PrefabUtility.InstantiatePrefab(model);
            instance.transform.SetParent(root.transform, false);
            // The FBX exporter emits Blender Y-up coordinates in the file's
            // Z-up basis. Unity imports that basis with Y/Z exchanged; this
            // local correction restores +Y height and Z port/starboard span.
            instance.transform.localRotation = Quaternion.Euler(-90f, 0f, 0f);
            foreach (var importedLod in instance.GetComponentsInChildren<LODGroup>(true))
                Object.DestroyImmediate(importedLod);
            var renderers = instance.GetComponentsInChildren<MeshRenderer>(true);
            if (renderers.Length < 18) throw new InvalidDataException("The assembled FBX is missing parts or LODs: " + renderers.Length);
            foreach (var renderer in renderers) renderer.sharedMaterial = material;
            var lods = new LOD[3];
            for (int level = 0; level < lods.Length; level++)
            {
                var levelRenderers = renderers.Where(r => r.name.EndsWith("_LOD" + level, StringComparison.Ordinal)).Cast<Renderer>().ToArray();
                if (levelRenderers.Length != 8) throw new InvalidDataException("LOD" + level + " has " + levelRenderers.Length + " parts; expected hull, two wings, two drives and three legs.");
                lods[level] = new LOD(new[] { .42f, .12f, .025f }[level], levelRenderers);
            }
            var group = root.AddComponent<LODGroup>(); group.SetLODs(lods); group.RecalculateBounds();
            Bounds bounds = renderers[0].bounds; foreach (var renderer in renderers.Skip(1)) bounds.Encapsulate(renderer.bounds);
            if (bounds.size.x < 17 || bounds.size.z < 10) throw new InvalidDataException("Assembled ship extents are too small: " + bounds.size);
            PrefabUtility.SaveAsPrefabAsset(root, destination + "/Kestrel_K017.prefab");
            AssetDatabase.SaveAssetIfDirty(material);
            File.WriteAllText("Validation/kestrel-textured-ship-import.txt",
                "PASS: complete locally generated Kestrel FBX imported.\nBuild: " + buildId + "\nRenderers: " + renderers.Length + " across three LOD levels.\n" +
                "Bounds: " + bounds.size + " metres.\nOne shared atlas material uses Blender-baked base colour, high-to-low tangent normals, and metallic/smoothness.\nPrefab remains in the ArtLab.\n");
        }
        finally { Object.DestroyImmediate(root); }
    }

    [MenuItem("Space Patriot/Art lab/Capture latest baked Kestrel")]
    public static void CaptureLatest()
    {
        if (!File.Exists(ActiveBuild)) throw new FileNotFoundException("No active Kestrel build.", ActiveBuild);
        string id = File.ReadAllText(ActiveBuild).Trim();
        string prefabPath = Root + "/" + id + "/Kestrel_K017.prefab";
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
        if (prefab == null) throw new InvalidOperationException("Import the latest Kestrel before capturing it.");
        var stage = new GameObject("Kestrel art review stage"); stage.transform.position = new Vector3(50000, 8000, 0);
        var ship = Object.Instantiate(prefab, stage.transform);
        foreach (var t in ship.GetComponentsInChildren<Transform>()) t.gameObject.layer = 30;
        ship.GetComponent<LODGroup>().ForceLOD(0);
        var camera = new GameObject("Kestrel review camera").AddComponent<Camera>();
        camera.transform.SetParent(stage.transform, false); camera.cullingMask = 1 << 30; camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(.48f, .53f, .56f); camera.nearClipPlane = .1f; camera.farClipPlane = 120;
        camera.orthographic = false; camera.fieldOfView = 42;
        var light = new GameObject("Kestrel review key").AddComponent<Light>();
        light.transform.SetParent(stage.transform, false); light.type = LightType.Directional; light.intensity = 1.7f;
        light.transform.localRotation = Quaternion.Euler(35, -28, 0); light.cullingMask = 1 << 30;
        Bounds b = ship.GetComponent<LODGroup>().GetLODs()[0].renderers[0].bounds;
        foreach (var r in ship.GetComponentsInChildren<Renderer>()) b.Encapsulate(r.bounds);
        bool fog = RenderSettings.fog; RenderSettings.fog = false;
        var rt = new RenderTexture(1500, 1050, 24); var previous = RenderTexture.active;
        try
        {
            var views = new[] { new Vector3(.22f, .65f, -1.0f), new Vector3(0f, .28f, -1.7f), new Vector3(0f, 1.4f, 0f) };
            for (int i = 0; i < views.Length; i++)
            {
                camera.transform.position = b.center + views[i].normalized * Mathf.Max(b.size.x, b.size.z) * 1.65f;
                camera.transform.LookAt(b.center, i == 2 ? Vector3.forward : Vector3.up); camera.targetTexture = rt;
                RenderPipeline.SubmitRenderRequest(camera, new UnityEngine.Rendering.Universal.UniversalRenderPipeline.SingleCameraRequest { destination = rt });
                RenderTexture.active = rt; var image = new Texture2D(1500, 1050, TextureFormat.RGB24, false);
                image.ReadPixels(new Rect(0, 0, 1500, 1050), 0, 0); image.Apply();
                string source = "ArtDirection/Generated/KestrelK017/" + id + "/Renders/unity-" + i + ".png";
                File.WriteAllBytes(source, image.EncodeToPNG()); Object.DestroyImmediate(image);
            }
        }
        finally
        {
            camera.targetTexture = null; RenderTexture.active = previous; Object.DestroyImmediate(rt);
            RenderSettings.fog = fog; Object.DestroyImmediate(stage);
        }
    }

    static void Copy(string source, string destination)
    {
        if (!File.Exists(source)) throw new FileNotFoundException("Required baked ship asset was not produced.", source);
        Directory.CreateDirectory(Path.GetDirectoryName(destination));
        File.Copy(source, destination, true);
    }

    [Serializable] class BuildReport { public string ship; public PartReport[] parts; }
    [Serializable] class PartReport { public string part; }
}
