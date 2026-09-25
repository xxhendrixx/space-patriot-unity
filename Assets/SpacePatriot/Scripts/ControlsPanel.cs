using UnityEngine;
using UnityEngine.InputSystem;
namespace SpacePatriot
{
    public partial class FrontierGame
    {
        string captureBinding="";
        void ControlsPanel()
        {
            Text("Select a binding, then press its replacement key. Conflicts swap keys.",400,229,910,28,17,muted);
            string devices=Gamepad.current!=null?Gamepad.current.displayName:Joystick.current!=null?Joystick.current.displayName:"Keyboard + mouse";
            Text("INPUT: "+devices,400,265,910,28,14,aqua,true);
            for(int i=0;i<bindings.entries.Count;i++)
            {
                var row=bindings.entries[i];int rows=(bindings.entries.Count+1)/2,col=i/rows,index=i%rows;float x=400+col*463,y=309+index*27;
                Text(row.action,x,y+3,255,25,15,paper);
                if(Button(captureBinding==row.action?"PRESS KEY…":row.key.ToString(),x+249,y,198,26,captureBinding==row.action))captureBinding=row.action;
            }
            if(captureBinding!=""&&Keyboard.current!=null)foreach(var key in Keyboard.current.allKeys)if(key.wasPressedThisFrame&&key.keyCode!=Key.Escape){bindings.Bind(captureBinding,key.keyCode);captureBinding="";break;}
            Text("Gamepad: left stick translates, right stick aims, LB/RB down/up, LT brake, RT fire, A boost, B board, View camera, L-stick assist, R-stick arm.",400,731,910,43,14,muted);
        }
    }
}
