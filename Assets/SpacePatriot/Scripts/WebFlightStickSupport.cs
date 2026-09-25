using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Layouts;
using UnityEngine.InputSystem.LowLevel;

namespace SpacePatriot
{
    // The WebGL fallback makes Trigger an AnyKey over every button. Large HOTAS
    // reports exceed AnyKey's 511-bit limit. A trigger is one physical button;
    // preserve every generated axis/button and override only that alias.
    public static class WebFlightStickSupport
    {
        [Serializable] class Capabilities { public int numAxes, numButtons; public string mapping; }
        [Serializable] class Override { public string name, extend; public Control[] controls; }
        [Serializable] class Control { public string name="trigger", layout="Button", format="FLT"; public int offset, bit=0, sizeInBits=32; }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        public static void Install()
        {
            InputSystem.onFindLayoutForDevice -= FixTrigger;
            InputSystem.onFindLayoutForDevice += FixTrigger;
        }
        static string FixTrigger(ref InputDeviceDescription description, string matchedLayout, InputDeviceExecuteCommandDelegate command)
        {
            if (!string.Equals(description.interfaceName,"WebGL",StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(matchedLayout)) return null;
            var caps=JsonUtility.FromJson<Capabilities>(description.capabilities);
            if (caps==null || caps.mapping=="standard" || caps.numButtons<1) return null;
            var data=new Override { name="SpacePatriot trigger / "+matchedLayout, extend=matchedLayout,
                controls=new[]{new Control { offset=caps.numAxes*4 }} };
            InputSystem.RegisterLayoutOverride(JsonUtility.ToJson(data),data.name);
            return null;
        }
    }
}
