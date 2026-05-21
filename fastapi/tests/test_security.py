from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from jose import jwt

from app.config import settings
from app.utils.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)


def test_get_password_hash_returns_bcrypt_string():
    """Test that hashed password uses bcrypt format"""
    hashed = get_password_hash("secret")
    assert hashed.startswith("$2b$")


def test_get_password_hash_is_salted():
    """Test that identical passwords produce different hashes due to random salt"""
    h1 = get_password_hash("secret")
    h2 = get_password_hash("secret")
    assert h1 != h2


def test_verify_password_correct():
    """Test that correct password verifies successfully"""
    hashed = get_password_hash("correct-horse")
    assert verify_password("correct-horse", hashed) is True


def test_verify_password_wrong():
    """Test that wrong password fails verification"""
    hashed = get_password_hash("correct-horse")
    assert verify_password("wrong-horse", hashed) is False


def test_create_access_token_returns_string():
    """Test that create_access_token returns a non-empty string"""
    token = create_access_token({"sub": "42"})
    assert isinstance(token, str) and len(token) > 0


def test_create_access_token_contains_sub():
    """Test that encoded token payload contains the sub claim"""
    token = create_access_token({"sub": "99"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "99"


def test_create_access_token_exp_matches_config():
    """Test that token expiry matches ACCESS_TOKEN_EXPIRE_MINUTES setting"""
    before = datetime.now(tz=timezone.utc).replace(microsecond=0)
    token = create_access_token({"sub": "1"})
    after = datetime.now(tz=timezone.utc).replace(microsecond=0)

    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    # Allow 1-second slack because JWT exp is stored as an integer second
    expected_min = before + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES) - timedelta(seconds=1)
    expected_max = after + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES) + timedelta(seconds=1)
    assert expected_min <= exp <= expected_max


def test_create_access_token_different_subs_differ():
    """Test that tokens with different sub values are not equal"""
    t1 = create_access_token({"sub": "1"})
    t2 = create_access_token({"sub": "2"})
    assert t1 != t2


def test_get_current_user_returns_user(db, test_user):
    """Test that a valid token returns the matching user"""
    token = create_access_token({"sub": str(test_user.id)})
    user = get_current_user(token=token, db=db)
    assert user.id == test_user.id
    assert user.email == test_user.email


def test_get_current_user_wrong_key(db, test_user):
    """Test that a token signed with a different key raises 401"""
    token = jwt.encode(
        {"sub": str(test_user.id), "exp": datetime.utcnow() + timedelta(minutes=30)},
        "wrong-secret",
        algorithm=settings.ALGORITHM,
    )
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401


def test_get_current_user_expired_token(db, test_user):
    """Test that an expired token raises 401"""
    token = jwt.encode(
        {"sub": str(test_user.id), "exp": datetime.utcnow() - timedelta(minutes=1)},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401


def test_get_current_user_missing_sub(db):
    """Test that a token without a sub claim raises 401"""
    token = create_access_token({"data": "no-sub-here"})
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401


def test_get_current_user_nonexistent_user(db):
    """Test that a valid token for an unknown user id raises 401"""
    token = create_access_token({"sub": "99999"})
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db)
    assert exc_info.value.status_code == 401
