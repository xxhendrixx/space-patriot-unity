using System;
using System.IO;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Layouts;
using SpacePatriot;

public static class WebInputValidation
{
    public static void Run()
    {
        using var scope=new ValidationInputScope();
        WebFlightStickSupport.Install();
        var previous=Joystick.current;
        var device=InputSystem.AddDevice(new InputDeviceDescription {
            interfaceName="WebGL",deviceClass="Joystick",product="Space Patriot HOTAS validation",
            capabilities="{\"numAxes\":32,\"numButtons\":128,\"mapping\":\"\"}" });
        try {
            var joy=(Joystick)device;
            if(joy.trigger.stateBlock.sizeInBits!=32)throw new Exception("Trigger must be one float button");
            InputSystem.QueueDeltaStateEvent(joy.trigger,1f);InputSystem.Update();
            if(!joy.trigger.isPressed)throw new Exception("Physical trigger event not received");
            InputSystem.QueueDeltaStateEvent(joy.trigger,0f);InputSystem.Update();
            if(joy.trigger.isPressed)throw new Exception("Physical trigger did not release");
            File.WriteAllText("Validation/web-hotas.txt","PASS: WebGL report with 32 axes and 128 buttons initializes; physical trigger press/release works without oversized AnyKey.\n");
        }
        finally { InputSystem.RemoveDevice(device); if(previous!=null)previous.MakeCurrent(); }
    }
}
