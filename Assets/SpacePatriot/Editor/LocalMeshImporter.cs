using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;
using UnityEngine.Rendering;
using Object = UnityEngine.Object;

// Keep generated candidates outside the live fleet until their visual review passes.
public static class LocalMeshImporter
{
    const string Folder = "Assets/SpacePatriot/ArtLab/KestrelDrive";
    const string ModelPath = Folder + "/Kestrel_Drive.fbx";
    const string Source = "ArtDirection/Generated/KestrelDrive/Kestrel_Drive.fbx";

    [MenuItem("Space Patriot/Art lab/Import local Kestrel drive")]
    public static void ImportKestrel()
    {
        if (!File.Exists(Source)) throw new FileNotFoundException("Generate and review the Blender component first.", Source);
        Directory.CreateDirectory(Folder);
        File.Copy(Source, ModelPath, true);
        AssetDatabase.ImportAsset(ModelPath, ImportAssetOptions.ForceSynchronousImport);
        var importer = (ModelImporter)AssetImporter.GetAtPath(ModelPath);
        importer.animationType = ModelImporterAnimationType.Generic;
        importer.importAnimation = true;
        importer.materialImportMode = ModelImporterMaterialImportMode.None;
        importer.importCameras = false;
        importer.importLights = false;
        importer.meshCompression = ModelImporterMeshCompression.Off;
        importer.importNormals = ModelImporterNormals.Import;
        importer.SaveAndReimport();

        var imported = AssetDatabase.LoadAssetAtPath<GameObject>(ModelPath);
        var root = new GameObject("Kestrel drive — local mesh review");
        try
        {
            var model = (GameObject)PrefabUtility.InstantiatePrefab(imported);
            model.transform.SetParent(root.transform, false);
            var materialPath = Folder + "/InspectionClay.mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (material == null)
            {
                material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                AssetDatabase.CreateAsset(material, materialPath);
            }
            material.SetColor("_BaseColor", new Color(.39f, .43f, .44f));
            material.SetFloat("_Metallic", .3f);
            material.SetFloat("_Smoothness", .52f);
            EditorUtility.SetDirty(material);
            var renderers = model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            var lods = new LOD[3];
            var triangles = new int[3];
            for (int level = 0; level < 3; level++)
            {
                var mesh = renderers.Single(r => r.name.EndsWith("_LOD" + level));
                mesh.gameObject.SetActive(true);
                mesh.enabled = true;
                mesh.sharedMaterial = material;
                mesh.updateWhenOffscreen = true;
                triangles[level] = mesh.sharedMesh.triangles.Length / 3;
                lods[level] = new LOD(new[] { .45f, .15f, .025f }[level], new Renderer[] { mesh });
            }
            var group = root.AddComponent<LODGroup>();
            group.SetLODs(lods);
            group.RecalculateBounds();
            var bounds = renderers.First(r => r.name.EndsWith("_LOD0")).bounds;
            float extent = Mathf.Max(bounds.size.x, bounds.size.y, bounds.size.z);
            if (extent < 5.7f || extent > 6.3f) throw new Exception("FBX metre scale is incorrect: " + extent);

            var clips = AssetDatabase.LoadAllAssetsAtPath(ModelPath).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview__")).ToArray();
            var flight = clips.Single(c => c.name.EndsWith("_Flight"));
            var landing = clips.Single(c => c.name.EndsWith("_Landing"));
            var hinge = model.GetComponentsInChildren<Transform>().Single(t => t.name == "DriveGimbal");
            flight.SampleAnimation(model, 0);
            var start = hinge.localRotation;
            flight.SampleAnimation(model, flight.length);
            var end = hinge.localRotation;
            float travel = Quaternion.Angle(start, end);
            if (travel < 85 || travel > 95) throw new Exception("Imported hinge clip does not travel 90 degrees: " + travel);
            flight.SampleAnimation(model, 0);

            var controllerPath = Folder + "/Drive.controller";
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(controllerPath);
            if (controller == null) controller = AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            var machine = controller.layers[0].stateMachine;
            foreach (var state in machine.states) machine.RemoveState(state.state);
            var flightState = machine.AddState("Flight"); flightState.motion = flight;
            var landingState = machine.AddState("Landing"); landingState.motion = landing;
            machine.defaultState = flightState;
            var animator = model.GetComponent<Animator>();
            if (animator == null) animator = model.AddComponent<Animator>();
            animator.runtimeAnimatorController = controller;
            EditorUtility.SetDirty(controller);
            PrefabUtility.SaveAsPrefabAsset(root, Folder + "/KestrelDrive.prefab");
            AssetDatabase.SaveAssetIfDirty(material);
            AssetDatabase.SaveAssetIfDirty(controller);
            Directory.CreateDirectory("Validation");
            File.WriteAllText("Validation/local-mesh-import.txt", "PASS: actual local model FBX imported.\nLOD triangles: " + string.Join(", ", triangles) + "\nLongest extent: " + extent + " metres\nFlight and Landing clips present; hinge travel: " + travel + " degrees\nInspection material only; candidate is not yet installed in the live fleet.\n");
        }
        finally { Object.DestroyImmediate(root); }
    }

    [MenuItem("Space Patriot/Art lab/Capture local Kestrel drive")]
    public static void Capture()
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Folder + "/KestrelDrive.prefab");
        if (prefab == null) throw new InvalidOperationException("Import the local drive before capturing it.");
        var stage = new GameObject("Local mesh inspection stage");
        stage.transform.position = new Vector3(40000, 5000, 0);
        var go = Object.Instantiate(prefab, stage.transform);
        foreach (var tr in go.GetComponentsInChildren<Transform>()) tr.gameObject.layer = 30;
        go.GetComponent<LODGroup>().ForceLOD(0);
        var camera = new GameObject("Local mesh camera").AddComponent<Camera>();
        camera.transform.SetParent(stage.transform, false);
        camera.cullingMask = 1 << 30; camera.nearClipPlane = .05f; camera.farClipPlane = 100;
        camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color(.12f, .14f, .17f);
        camera.orthographic = true; camera.orthographicSize = 4.2f;
        var light = new GameObject("Inspection key").AddComponent<Light>();
        light.transform.SetParent(stage.transform, false); light.type = LightType.Directional;
        light.transform.localRotation = Quaternion.Euler(35, -30, 0); light.intensity = 2; light.cullingMask = 1 << 30;
        var previousFog = RenderSettings.fog; RenderSettings.fog = false;
        var rt = new RenderTexture(1280, 1000, 24);
        var previousRT = RenderTexture.active;
        try
        {
            var positions = new[] { new Vector3(-1, .55f, 1), new Vector3(1, .3f, -1) };
            for (int i = 0; i < positions.Length; i++)
            {
                camera.transform.localPosition = positions[i].normalized * 14;
                camera.transform.LookAt(stage.transform.position);
                camera.targetTexture = rt;
                RenderPipeline.SubmitRenderRequest(camera, new UnityEngine.Rendering.Universal.UniversalRenderPipeline.SingleCameraRequest { destination = rt });
                RenderTexture.active = rt;
                var texture = new Texture2D(1280, 1000, TextureFormat.RGB24, false);
                texture.ReadPixels(new Rect(0, 0, 1280, 1000), 0, 0); texture.Apply();
                File.WriteAllBytes("ArtDirection/Generated/KestrelDrive/unity-" + i + ".png", texture.EncodeToPNG());
                Object.DestroyImmediate(texture);
            }
        }
        finally
        {
            camera.targetTexture = null; RenderTexture.active = previousRT;
            Object.DestroyImmediate(rt); Object.DestroyImmediate(stage); RenderSettings.fog = previousFog;
        }
    }
}
