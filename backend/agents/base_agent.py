"""agents/base_agent.py"""
import logging

class BaseAgent:
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(name)
        if not self.logger.handlers:
            h = logging.StreamHandler()
            h.setFormatter(logging.Formatter("[%(asctime)s][%(name)s][%(levelname)s] %(message)s", "%H:%M:%S"))
            self.logger.addHandler(h)
            self.logger.setLevel(logging.INFO)

    def log(self, msg: str, level: str = "info"):
        getattr(self.logger, level, self.logger.info)(msg)
