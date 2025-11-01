"""
User Repository - Neo4j database operations for User entity
"""
from typing import Optional, Dict
from datetime import datetime
import uuid


class UserRepository:
    """Repository for User CRUD operations"""
    
    def __init__(self, session):
        self.session = session
    
    def create_user(self, handle: str, email: str, password_hash: str, 
                   verification_token: str, verification_token_expires: str,
                   country: Optional[str] = None, city: Optional[str] = None) -> Dict:
        """
        Create a new user in Neo4j
        
        Args:
            handle: User's handle/username
            email: User's email
            password_hash: Hashed password
            verification_token: Email verification token
            verification_token_expires: Token expiration
            country: User's country (optional)
            city: User's city (optional)
        
        Returns:
            Created user data
        """
        query = """
        CREATE (u:User {
            id: $id,
            handle: $handle,
            email: $email,
            password_hash: $password_hash,
            country: $country,
            city: $city,
            created_at: datetime(),
            last_login_at: datetime(),
            source_accounts: [],
            is_pro: false,
            consent_analytics: false,
            onboarding_complete: false,
            email_verified: false,
            is_active: false,
            verification_token: $verification_token,
            verification_token_expires: $verification_token_expires
        })
        RETURN u
        """
        
        user_id = str(uuid.uuid4())
        result = self.session.run(
            query,
            id=user_id,
            handle=handle,
            email=email,
            password_hash=password_hash,
            country=country,
            city=city,
            verification_token=verification_token,
            verification_token_expires=verification_token_expires
        )
        
        record = result.single()
        if record:
            user_data = dict(record["u"])
            # Convert Neo4j DateTime to Python datetime
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """
        Get user by email
        
        Args:
            email: User's email
        
        Returns:
            User data or None
        """
        query = """
        MATCH (u:User {email: $email})
        RETURN u
        """
        
        result = self.session.run(query, email=email)
        record = result.single()
        
        if record:
            user_data = dict(record["u"])
            # Convert Neo4j DateTime to Python datetime
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
    
    def get_user_by_handle(self, handle: str) -> Optional[Dict]:
        """
        Get user by handle
        
        Args:
            handle: User's handle
        
        Returns:
            User data or None
        """
        query = """
        MATCH (u:User {handle: $handle})
        RETURN u
        """
        
        result = self.session.run(query, handle=handle)
        record = result.single()
        
        if record:
            user_data = dict(record["u"])
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """
        Get user by ID
        
        Args:
            user_id: User's ID
        
        Returns:
            User data or None
        """
        query = """
        MATCH (u:User {id: $user_id})
        RETURN u
        """
        
        result = self.session.run(query, user_id=user_id)
        record = result.single()
        
        if record:
            user_data = dict(record["u"])
            # Convert Neo4j DateTime to Python datetime
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
    
    def update_user(self, user_id: str, updates: Dict) -> Optional[Dict]:
        """
        Update user properties
        
        Args:
            user_id: User's ID
            updates: Dictionary of properties to update
        
        Returns:
            Updated user data or None
        """
        # Build SET clause dynamically
        set_clauses = [f"u.{key} = ${key}" for key in updates.keys()]
        set_clause = ", ".join(set_clauses)
        
        query = f"""
        MATCH (u:User {{id: $user_id}})
        SET {set_clause}
        RETURN u
        """
        
        result = self.session.run(query, user_id=user_id, **updates)
        record = result.single()
        
        if record:
            user_data = dict(record["u"])
            # Convert Neo4j DateTime to Python datetime
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
    
    def add_source_account(self, user_id: str, source: str) -> bool:
        """
        Add a connected music source account
        
        Args:
            user_id: User's ID
            source: Source name (e.g., "spotify", "lastfm")
        
        Returns:
            True if successful
        """
        query = """
        MATCH (u:User {id: $user_id})
        SET u.source_accounts = 
            CASE 
                WHEN $source IN u.source_accounts THEN u.source_accounts
                ELSE u.source_accounts + $source
            END
        RETURN u
        """
        
        result = self.session.run(query, user_id=user_id, source=source)
        return result.single() is not None
    
    def update_last_login(self, user_id: str) -> bool:
        """
        Update user's last login timestamp
        
        Args:
            user_id: User's ID
        
        Returns:
            True if successful
        """
        query = """
        MATCH (u:User {id: $user_id})
        SET u.last_login_at = datetime()
        RETURN u
        """
        
        result = self.session.run(query, user_id=user_id)
        return result.single() is not None
    
    def verify_email(self, token: str) -> Optional[Dict]:
        """
        Verify user email with token
        
        Args:
            token: Verification token
        
        Returns:
            Updated user data or None
        """
        query = """
        MATCH (u:User {verification_token: $token})
        WHERE datetime(u.verification_token_expires) > datetime()
        SET u.email_verified = true,
            u.is_active = true,
            u.verification_token = null,
            u.verification_token_expires = null
        RETURN u
        """
        
        result = self.session.run(query, token=token)
        record = result.single()
        
        if record:
            user_data = dict(record["u"])
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
    
    def get_user_by_verification_token(self, token: str) -> Optional[Dict]:
        """
        Get user by verification token
        
        Args:
            token: Verification token
        
        Returns:
            User data or None
        """
        query = """
        MATCH (u:User {verification_token: $token})
        RETURN u
        """
        
        result = self.session.run(query, token=token)
        record = result.single()
        
        if record:
            user_data = dict(record["u"])
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
    
    def create_password_reset_token(self, email: str, token: str, expires: str) -> bool:
        """
        Create password reset token for user
        
        Args:
            email: User's email
            token: Reset token
            expires: Expiration timestamp
        
        Returns:
            True if successful
        """
        query = """
        MATCH (u:User {email: $email})
        SET u.reset_token = $token,
            u.reset_token_expires = $expires
        RETURN u
        """
        
        result = self.session.run(query, email=email, token=token, expires=expires)
        return result.single() is not None
    
    def reset_password(self, token: str, new_password_hash: str) -> Optional[Dict]:
        """
        Reset user password with token
        
        Args:
            token: Reset token
            new_password_hash: New hashed password
        
        Returns:
            Updated user data or None
        """
        query = """
        MATCH (u:User {reset_token: $token})
        WHERE datetime(u.reset_token_expires) > datetime()
        SET u.password_hash = $new_password_hash,
            u.reset_token = null,
            u.reset_token_expires = null
        RETURN u
        """
        
        result = self.session.run(query, token=token, new_password_hash=new_password_hash)
        record = result.single()
        
        if record:
            user_data = dict(record["u"])
            if "created_at" in user_data and user_data["created_at"]:
                user_data["created_at"] = user_data["created_at"].to_native()
            if "last_login_at" in user_data and user_data["last_login_at"]:
                user_data["last_login_at"] = user_data["last_login_at"].to_native()
            return user_data
        return None
