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
                   country: Optional[str] = None, city: Optional[str] = None) -> Dict:
        """
        Create a new user in Neo4j
        
        Args:
            handle: User's handle/username
            email: User's email
            password_hash: Hashed password
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
            onboarding_complete: false
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
            city=city
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

