from fastapi import Depends, HTTPException, status
from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import get_neo4j_session


async def _fetch_role(user_id: str, session) -> str:
    result = await session.run(
        "MATCH (u:User {id: $id}) RETURN u.role AS role",
        id=user_id,
    )
    record = await result.single()
    return (record["role"] if record and record["role"] else "user")


async def require_admin(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    role = await _fetch_role(current_user["id"], session)
    if role not in ("admin", "superadmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return {**current_user, "role": role}


async def require_superadmin(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    role = await _fetch_role(current_user["id"], session)
    if role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    return {**current_user, "role": role}
