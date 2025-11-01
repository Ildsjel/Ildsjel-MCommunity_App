"""
Neo4j Database Driver & Connection Management
"""
from neo4j import GraphDatabase
from app.config.settings import settings
from typing import Optional


class Neo4jDriver:
    """Singleton Neo4j driver instance"""
    
    _instance: Optional['Neo4jDriver'] = None
    _driver = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
    
    def get_driver(self):
        """Get the Neo4j driver instance"""
        return self._driver
    
    def close(self):
        """Close the Neo4j driver connection"""
        if self._driver:
            self._driver.close()
            self._driver = None
    
    def verify_connectivity(self) -> bool:
        """Verify Neo4j connection"""
        try:
            self._driver.verify_connectivity()
            return True
        except Exception as e:
            print(f"Neo4j connection failed: {e}")
            return False


# Global driver instance
neo4j_driver = Neo4jDriver()


def get_neo4j_session():
    """Dependency for FastAPI routes to get a Neo4j session"""
    driver = neo4j_driver.get_driver()
    with driver.session() as session:
        yield session

