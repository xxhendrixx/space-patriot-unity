using System;
using System.IO;
using System.Collections.Generic;
using SpacePatriot;
using UnityEditor;
using UnityEngine;

public static class DesktopProjectValidation
{
    public static void Run()
    {
        var lines=new List<string>();
        void Check(bool value,string label){if(!value)throw new Exception(label);lines.Add("PASS "+label);}
        Check(EditorUserBuildSettings.activeBuildTarget==BuildTarget.StandaloneWindows64,"Editor targets Windows x64");
        Check(PlayerSettings.resizableWindow,"Desktop window is resizable");
        Check(PlayerSettings.GetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone)==ScriptingImplementation.Mono2x,"Standalone scripting backend configured");
        string directory=Path.Combine(Path.GetTempPath(),"SpacePatriotSaveCheck-"+Guid.NewGuid().ToString("N"));
        try{
            var sample=new SaveData{credits=12345};CampaignStorage.Write(sample,directory);
            Check(CampaignStorage.ReadFiles(directory).credits==12345,"File save reads back progress");
            sample.credits=23456;CampaignStorage.Write(sample,directory);
            Check(CampaignStorage.ReadFiles(directory).credits==23456,"Second generation replaces the current save");
            Check(File.Exists(Path.Combine(directory,"frontier-v1.previous.json")),"Previous complete save is retained");
            File.WriteAllText(Path.Combine(directory,"frontier-v1.json"),"interrupted-save");
            Check(CampaignStorage.ReadFiles(directory).credits==12345,"Recovery reads previous generation after corruption");
            Check(!File.Exists(Path.Combine(directory,"frontier-v1.json.tmp")),"No pending write remains after successful saves");
        }finally{
            foreach(string name in new[]{"frontier-v1.json","frontier-v1.previous.json","frontier-v1.json.tmp"})File.Delete(Path.Combine(directory,name));
            if(Directory.Exists(directory))Directory.Delete(directory);
        }
        lines.Add("NOT RUN: native player build and installer. Delivery remains the Unity project during development, by request.");
        Directory.CreateDirectory("Validation");File.WriteAllLines("Validation/desktop-project.txt",lines);
    }
}
