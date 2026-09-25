using System;
using System.IO;
using UnityEngine;

namespace SpacePatriot
{
    // Explicit opt-in used by the built player smoke test; never touches a player's save.
    public static class DesktopVerification
    {
        public static readonly bool Active = Array.IndexOf(Environment.GetCommandLineArgs(), "--verify-space-patriot") >= 0;
    }

    public static class CampaignStorage
    {
        static bool Native => !Application.isEditor && Application.platform != RuntimePlatform.WebGLPlayer;
        const string LegacyKey = "SpacePatriot.Unity.Frontier.v1";
        public static string DirectoryPath => Path.Combine(Application.persistentDataPath, "saves");
        static string Current(string directory) => Path.Combine(directory, "frontier-v1.json");
        static string Backup(string directory) => Path.Combine(directory, "frontier-v1.previous.json");
        public static bool Exists => !Native
            ? PlayerPrefs.HasKey(LegacyKey)
            : File.Exists(Current(DirectoryPath)) || File.Exists(Backup(DirectoryPath)) || PlayerPrefs.HasKey(LegacyKey);

        public static SaveData Load()
        {
            if (Native)
            {
                var data = ReadFiles(DirectoryPath);
                if (data != null) return data;
            }
            try { return PlayerPrefs.HasKey(LegacyKey) ? JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(LegacyKey)) : new SaveData(); }
            catch (ArgumentException) { return new SaveData(); }
        }

        public static SaveData ReadFiles(string directory)
        {
            foreach (var path in new[] { Current(directory), Backup(directory) })
            {
                try
                {
                    if (!File.Exists(path)) continue;
                    var text = File.ReadAllText(path);
                    if (!text.Contains("\"version\"") || !text.Contains("\"ship\"")) continue;
                    var data = JsonUtility.FromJson<SaveData>(text);
                    if (data != null && data.version >= 1) return data;
                }
                catch (Exception e) when (e is IOException || e is UnauthorizedAccessException || e is ArgumentException)
                { Debug.LogWarning("Save could not be read; trying the previous save: " + e.Message); }
            }
            return null;
        }

        public static void Write(SaveData data, string directory = null)
        {
            if (directory == null && !Native)
            { PlayerPrefs.SetString(LegacyKey, JsonUtility.ToJson(data)); PlayerPrefs.Save(); return; }
            directory ??= DirectoryPath;
            Directory.CreateDirectory(directory);
            var path = Current(directory);
            var pending = path + ".tmp";
            File.WriteAllText(pending, JsonUtility.ToJson(data));
            // Replace is atomic on Windows; the last complete generation remains available.
            if (File.Exists(path)) File.Replace(pending, path, Backup(directory));
            else File.Move(pending, path);
        }

        public static void Reset()
        {
            if (Native)
                foreach (var path in new[] { Current(DirectoryPath), Backup(DirectoryPath), Current(DirectoryPath) + ".tmp" })
                    if (File.Exists(path)) File.Delete(path);
            PlayerPrefs.DeleteKey(LegacyKey);
            PlayerPrefs.Save();
        }
    }

    public partial class FrontierGame
    {
        void ToggleDesktopFullscreen()
        {
            if (Application.isEditor || Application.platform == RuntimePlatform.WebGLPlayer) return;
            bool full = !Screen.fullScreen;
            Screen.SetResolution(full ? Screen.currentResolution.width : 1440,
                full ? Screen.currentResolution.height : 900,
                full ? FullScreenMode.FullScreenWindow : FullScreenMode.Windowed);
            PlayerPrefs.SetInt("sp.fullscreen", full ? 1 : 0);
            PlayerPrefs.Save();
        }
        void QuitToDesktop()
        {
            if (started) Save();
            PlayerPrefs.Save();
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }
    }
}
