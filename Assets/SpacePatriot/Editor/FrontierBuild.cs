using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using SpacePatriot;

public static class FrontierBuild
{
    const string ScenePath="Assets/SpacePatriot/Scenes/Frontier.unity";
    [MenuItem("Space Patriot/Configure project")]
    public static void Configure()
    {
        Directory.CreateDirectory("Assets/SpacePatriot/Scenes");
        Directory.CreateDirectory("Assets/SpacePatriot/Resources/Rendering");
        var pipeline=AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/Settings/PC_RPAsset.asset");
        pipeline.renderScale=.9f;pipeline.msaaSampleCount=2;pipeline.shadowDistance=180;
        GraphicsSettings.defaultRenderPipeline=pipeline;QualitySettings.renderPipeline=pipeline;EditorUtility.SetDirty(pipeline);
        QualitySettings.shadowDistance=180;QualitySettings.shadowResolution=UnityEngine.ShadowResolution.High;QualitySettings.antiAliasing=2;
        ConfigureDesktopTarget();
        PlayerSettings.colorSpace=ColorSpace.Linear;
        foreach(var file in Directory.GetFiles("Assets/SpacePatriot/Resources/Surfaces","*.jpg"))
        {
            var importer=AssetImporter.GetAtPath(file.Replace('\\','/')) as TextureImporter;
            if(importer==null)continue;
            importer.maxTextureSize=1024;importer.mipmapEnabled=true;importer.wrapMode=TextureWrapMode.Repeat;importer.anisoLevel=4;
            if(file.Contains("_normal"))importer.textureType=TextureImporterType.NormalMap;
            importer.SaveAndReimport();
        }
        var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
        new GameObject("Space Patriot / runtime director").AddComponent<FrontierGame>();
        string path="Assets/SpacePatriot/Resources/Rendering/FrontierGrade.asset";
        var profile=AssetDatabase.LoadAssetAtPath<VolumeProfile>(path);
        if(profile==null){profile=ScriptableObject.CreateInstance<VolumeProfile>();AssetDatabase.CreateAsset(profile,path);}
        if(!profile.TryGet<Tonemapping>(out var tonemap)){tonemap=profile.Add<Tonemapping>(true);AssetDatabase.AddObjectToAsset(tonemap,profile);}tonemap.mode.Override(TonemappingMode.ACES);
        if(!profile.TryGet<Bloom>(out var bloom)){bloom=profile.Add<Bloom>(true);AssetDatabase.AddObjectToAsset(bloom,profile);}bloom.intensity.Override(.15f);bloom.threshold.Override(1.25f);
        if(!profile.TryGet<ColorAdjustments>(out var grading)){grading=profile.Add<ColorAdjustments>(true);AssetDatabase.AddObjectToAsset(grading,profile);}grading.postExposure.Override(.45f);grading.contrast.Override(12);grading.saturation.Override(-10);
        EditorUtility.SetDirty(profile);foreach(var component in profile.components)EditorUtility.SetDirty(component);
        var volume=new GameObject("Frontier color grade").AddComponent<Volume>();volume.isGlobal=true;volume.sharedProfile=profile;
        // Resource material retains all URP/Lit variants used by runtime meshes in the build.
        string materialPath="Assets/SpacePatriot/Resources/Rendering/IndustrialLit.asset";
        if(AssetDatabase.LoadAssetAtPath<Material>(materialPath)==null)
        {var mat=new Material(Shader.Find("Universal Render Pipeline/Lit"));mat.EnableKeyword("_EMISSION");mat.EnableKeyword("_NORMALMAP");mat.SetTexture("_BumpMap",Resources.Load<Texture2D>("Surfaces/steel_normal"));mat.SetColor("_EmissionColor",Color.white);AssetDatabase.CreateAsset(mat,materialPath);}
        string skyPath="Assets/SpacePatriot/Resources/Rendering/FrontierSky.mat";
        if(AssetDatabase.LoadAssetAtPath<Material>(skyPath)==null)
        {var sky=new Material(Shader.Find("Skybox/Procedural"));sky.SetFloat("_SunSize",.035f);sky.SetFloat("_AtmosphereThickness",.85f);sky.SetColor("_SkyTint",new Color(.46f,.51f,.54f));sky.SetColor("_GroundColor",new Color(.25f,.26f,.25f));sky.SetFloat("_Exposure",1.1f);AssetDatabase.CreateAsset(sky,skyPath);}
        RenderSettings.skybox=AssetDatabase.LoadAssetAtPath<Material>(skyPath);
        RenderSettings.fog=true;RenderSettings.fogMode=FogMode.ExponentialSquared;RenderSettings.fogDensity=.0008f;
        string starPath="Assets/SpacePatriot/Resources/Rendering/StarUnlit.mat";
        if(AssetDatabase.LoadAssetAtPath<Material>(starPath)==null)AssetDatabase.CreateAsset(new Material(Shader.Find("Universal Render Pipeline/Unlit")),starPath);
        // Original assets are imported through OriginalAssetImporter.
        EditorSceneManager.SaveScene(scene,ScenePath);EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
        AssetDatabase.SaveAssets();Validate();Debug.Log("SPACE_PATRIOT_CONFIGURED");
    }
    [MenuItem("Space Patriot/Validate progression")]
    public static void Validate()
    {
        var catalog=JsonUtility.FromJson<CampaignCatalog>(Resources.Load<TextAsset>("Campaign").text);
        var worlds=JsonUtility.FromJson<WorldCatalog>(Resources.Load<TextAsset>("Worlds").text).worlds;
        Assert(catalog.arcs.Length==9,"Nine cases preserved");Assert(worlds.Length==19,"Nineteen worlds preserved");
        Assert(catalog.arcs.Sum(c=>c.steps.Length)==27,"Twenty-seven objectives preserved");
        foreach(var c in catalog.arcs)foreach(var s in c.steps)Assert(worlds.Any(w=>w.name==s.world),"World resolves: "+s.world);
        var save=new SaveData();foreach(var c in catalog.arcs)Progression.Get(save,c.id);
        var water=catalog.arcs.First(c=>c.id=="water");
        Assert(!Progression.CompleteStep(save,water,"Earth","terminal",out _),"Unaccepted case cannot advance");
        Progression.Get(save,"water").accepted=true;
        Assert(!Progression.CompleteStep(save,water,"Mars","terminal",out _),"Wrong world cannot advance");
        Assert(Progression.CompleteStep(save,water,"Earth","terminal",out _),"Terminal advances case");
        save.organics=3;Assert(!Progression.CompleteStep(save,water,"Mars","delivery",out _),"Insufficient cargo cannot advance");
        save.organics=4;Assert(Progression.CompleteStep(save,water,"Mars","delivery",out _),"Cargo delivery advances case");Assert(save.organics==0,"Delivery consumes cargo exactly once");
        Assert(!Progression.Resolve(save,water,0),"Incomplete case cannot pay out");
        Assert(Progression.CompleteStep(save,water,"Earth","terminal",out _),"Final evidence advances case");
        int before=save.credits;Assert(Progression.Resolve(save,water,0),"Resolution rewards player");int after=save.credits;
        Assert(after==before+650,"Correct case payment");Assert(!Progression.Resolve(save,water,1)&&save.credits==after,"Duplicate resolution cannot pay twice");
        Assert(Progression.Unlocked(save,catalog.arcs.First(c=>c.id=="missing")),"Dependency unlocks after water case");
        var roundtrip=JsonUtility.FromJson<SaveData>(JsonUtility.ToJson(save));Assert(Progression.Get(roundtrip,"water").choice==0&&roundtrip.credits==save.credits,"Save roundtrip preserves choices and credits");
        int passed=0;
        foreach(var c in catalog.arcs)
        {
            var p=Progression.Get(save,c.id);if(p.choice>=0)continue;
            Assert(Progression.Unlocked(save,c),"Campaign dependency order: "+c.id);p.accepted=true;
            foreach(var step in c.steps)
            {if(step.kind=="delivery")Progression.AddCargo(save,step.good,step.units);Assert(Progression.CompleteStep(save,c,step.world,step.kind,out _),"Objective completes: "+c.id);passed++;}
            Assert(Progression.Resolve(save,c,0),"Case completes: "+c.id);
        }
        string report="PASS: 19 worlds; 9 cases; 27 objective references; invalid-event guards; cargo requirements and consumption; one-time rewards; dependency gates; save roundtrip; complete campaign traversal.\n";
        Directory.CreateDirectory("Validation");File.WriteAllText("Validation/progression.txt",report);Debug.Log("SPACE_PATRIOT_VALIDATION_PASS "+passed);
    }
    static void Assert(bool condition,string message){if(!condition)throw new Exception("Validation failed: "+message);}
    [MenuItem("Space Patriot/Build Windows desktop")]
    public static void BuildWindows()
    {
        Validate();
        ConfigureDesktopTarget();
        Directory.CreateDirectory("../Windows/SpacePatriot");
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName="../Windows/SpacePatriot/SpacePatriot.exe",target=BuildTarget.StandaloneWindows64,options=BuildOptions.None});
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Windows build failed: "+report.summary.result);
        File.WriteAllText("Validation/windows-build.txt","PASS: Windows x64 desktop player / Mono / Direct3D 11. Total output bytes: "+report.summary.totalSize+"\n");
        AssetDatabase.SaveAssets();Debug.Log("SPACE_PATRIOT_WINDOWS_BUILD_SUCCESS bytes="+report.summary.totalSize);
    }
    public static void ConfigureDesktopTarget()
    {
        PlayerSettings.companyName="Space Patriot";PlayerSettings.productName="Space Patriot";PlayerSettings.bundleVersion="0.2.0";
        PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
        PlayerSettings.SetManagedStrippingLevel(UnityEditor.Build.NamedBuildTarget.Standalone,ManagedStrippingLevel.Disabled);
        PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.defaultScreenWidth=1440;PlayerSettings.defaultScreenHeight=900;
        PlayerSettings.resizableWindow=true;PlayerSettings.runInBackground=true;
        PlayerSettings.usePlayerLog=true;PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.StandaloneWindows64,false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.StandaloneWindows64,new[]{GraphicsDeviceType.Direct3D11});
    }
    [MenuItem("Space Patriot/Build browser")]
    public static void BuildWeb()
    {
        PlayerSettings.WebGL.template="PROJECT:SpacePatriot";
        Validate();
        var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName="../Browser",target=BuildTarget.WebGL,options=BuildOptions.None});
        if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Browser build failed: "+report.summary.result);
        Debug.Log("SPACE_PATRIOT_WEB_BUILD_SUCCESS bytes="+report.summary.totalSize);
    }
}
