using UnityEngine;

namespace SpacePatriot
{
    public partial class FrontierWorld
    {
        // Walking uses the actual floor collision, including port/city/lift decks.
        // TrySurface is intentionally planet-only because ships use it for landing.
        readonly RaycastHit[] walkingHits = new RaycastHit[64];
        readonly Collider[] walkingObstacles = new Collider[64];

        public Vector3 WalkUp(Vector3 at)
        {
            Vector3 up = at - transform.TransformPoint(PlanetCenter);
            return up.sqrMagnitude > 1f ? up.normalized : transform.up;
        }

        public bool IsWalkDeck(Collider support)
        {
            if (!(support is BoxCollider) || !support.transform.IsChildOf(transform)) return false;
            switch (support.name)
            {
                case "Lift deck collision":
                case "Capital landing quay":
                case "Dock connection":
                case "Central utility boulevard":
                case "Public service square":
                case "Street connection":
                case "Survey field deck":
                    return true;
                case "Structural collision":
                    // The original port, outpost and orbital station use broad
                    // floor boxes. The hangar wall boxes are much taller.
                    return support.bounds.size.y <= 16.1f &&
                        support.bounds.size.x >= 20f && support.bounds.size.z >= 20f;
                default:
                    return false;
            }
        }

        public bool TryWalkSupport(Vector3 feet, float maxRise, float maxDrop,
            out Vector3 point, out Vector3 normal, out Collider support, bool deckOnly = false)
        {
            point = default;
            normal = WalkUp(feet);
            support = null;
            Vector3 up = normal;
            float reach = maxRise + maxDrop + .04f;
            Ray ray = new Ray(feet + up * (maxRise + .02f), -up);
            Physics.SyncTransforms();
            int count = Physics.RaycastNonAlloc(ray, walkingHits, reach,
                Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            // A crowded building can fill the fixed buffer. Keep the nearest
            // eligible floor rather than relying on PhysX's unsorted first hits.
            RaycastHit[] hits = count == walkingHits.Length
                ? Physics.RaycastAll(ray, reach, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore)
                : walkingHits;
            if (count == walkingHits.Length) count = hits.Length;
            float highest = -maxDrop - .01f;
            for (int i = 0; i < count; i++)
            {
                RaycastHit hit = hits[i];
                if (!hit.collider || !hit.collider.transform.IsChildOf(transform)) continue;
                bool deck = IsWalkDeck(hit.collider);
                if (deckOnly && !deck) continue;
                if (Vector3.Dot(hit.normal, up) < .7f) continue; // slope over ~45 degrees
                float rise = Vector3.Dot(hit.point - feet, up);
                if (rise > maxRise + .01f || rise < -maxDrop - .01f) continue;
                if (support != null)
                {
                    bool selectedDeck = IsWalkDeck(support);
                    // The planet cap and port deck can be coplanar. Keep the
                    // constructed floor as the authoritative walk surface.
                    if (deck != selectedDeck && Mathf.Abs(rise - highest) < .25f)
                    { if (!deck) continue; }
                    else if (rise < highest) continue;
                }
                highest = rise;
                point = hit.point;
                normal = hit.normal;
                support = hit.collider;
            }
            if (support != null) return true;
            if (deckOnly) return false;
            // The planetary mesh can lag one frame behind the moving local
            // patch. Its radial query is safe only within the same step limits.
            if (!TrySurface(feet, out Vector3 terrain, out Vector3 terrainNormal)) return false;
            float terrainRise = Vector3.Dot(terrain - feet, up);
            if (terrainRise > maxRise || terrainRise < -maxDrop || Vector3.Dot(terrainNormal, up) < .7f)
                return false;
            point = terrain;
            normal = terrainNormal;
            support = planetCollider;
            return true;
        }

        public bool WalkClear(Vector3 feet, Vector3 up, Collider support)
        {
            const float radius = .32f;
            // A small sole gap avoids floor contact counting as a blocking wall.
            Vector3 bottom = feet + up * (radius + .06f);
            Vector3 top = feet + up * (1.75f - radius);
            int count = Physics.OverlapCapsuleNonAlloc(bottom, top, radius,
                walkingObstacles, ~0, QueryTriggerInteraction.Ignore);
            Collider[] obstacles = count == walkingObstacles.Length
                ? Physics.OverlapCapsule(bottom, top, radius, ~0, QueryTriggerInteraction.Ignore)
                : walkingObstacles;
            if (count == walkingObstacles.Length) count = obstacles.Length;
            for (int i = 0; i < count; i++)
            {
                Collider obstacle = obstacles[i];
                if (!obstacle || obstacle == support || obstacle == planetCollider ||
                    obstacle == streamedTerrainCollider) continue;
                // The first-person weapon is attached to the camera; it is not
                // world geometry and must never block its owner.
                FrontierGame game = FrontierGame.Instance;
                if (game != null && game.view != null &&
                    obstacle.transform.IsChildOf(game.view.transform)) continue;
                return false;
            }
            return true;
        }
    }
}
