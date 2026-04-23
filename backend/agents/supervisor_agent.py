"""agents/supervisor_agent.py — orchestrates all agents."""
from __future__ import annotations
from agents.base_agent import BaseAgent

class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__("SupervisorAgent")
        from agents.route_agent      import RouteAgent
        from agents.scheduling_agent import SchedulingAgent
        from agents.crew_agent       import CrewAgent
        from agents.booking_agent    import BookingAgent
        from agents.analytics_agent  import AnalyticsAgent
        self.route      = RouteAgent()
        self.scheduling = SchedulingAgent()
        self.crew       = CrewAgent()
        self.booking    = BookingAgent()
        self.analytics  = AnalyticsAgent()
        self.log("All agents initialised.")

    def handle(self, agent: str, task: str, data: dict = None):
        self.log(f"Dispatching → {agent}.{task}")
        agents = {
            "route":      self.route,
            "scheduling": self.scheduling,
            "crew":       self.crew,
            "booking":    self.booking,
            "analytics":  self.analytics,
        }
        a = agents.get(agent)
        if not a:
            return {"error": f"Unknown agent: {agent}"}
        return a.execute(task, data or {})
