using UnityEngine;

namespace SpacePatriot
{
    // Metres and seconds. Translation is independent of rotation, including in decoupled flight.
    public static class FlightMotor
    {
        public static Vector3 Step(Vector3 velocity, Quaternion attitude, Vector3 translation,
            float speedLimit, float acceleration, float dt, bool assist, bool brake, bool powered)
        {
            if (!powered || dt <= 0) return velocity;
            translation=Vector3.ClampMagnitude(translation,1);
            Vector3 desired=attitude*translation*speedLimit;
            if(brake) return Vector3.MoveTowards(velocity,Vector3.zero,acceleration*2.4f*dt);
            if(assist) return Vector3.MoveTowards(velocity,desired,acceleration*dt);
            if(translation.sqrMagnitude<.00001f) return velocity;
            Vector3 direction=desired.normalized;
            float step=Mathf.Clamp(desired.magnitude-Vector3.Dot(velocity,direction),0,acceleration*dt);
            return velocity+direction*step;
        }
        public static Quaternion Rotate(Quaternion attitude,Vector3 localRates,float dt)
            => (attitude*Quaternion.Euler(localRates*dt)).normalized;
    }
}
