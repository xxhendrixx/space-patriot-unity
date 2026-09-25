using System;
using UnityEngine.InputSystem;

// The CLI can run while Game view is unfocused. Keep synthetic test events in
// the same player buffer, then restore the user's editor input preferences.
public sealed class ValidationInputScope : IDisposable
{
    readonly InputSettings settings = InputSystem.settings;
    readonly InputSettings.EditorInputBehaviorInPlayMode editor;
    readonly InputSettings.BackgroundBehavior background;
    public ValidationInputScope()
    {
        editor = settings.editorInputBehaviorInPlayMode;
        background = settings.backgroundBehavior;
        settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
        settings.editorInputBehaviorInPlayMode = InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
    }
    public void Dispose()
    {
        settings.editorInputBehaviorInPlayMode = editor;
        settings.backgroundBehavior = background;
    }
}
