import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import useAnnotator from "../hooks/useAnnotator"

export default function LandingPage() {

  const navigate = useNavigate()
  const location = useLocation()
  const { annotator, isLoading } = useAnnotator()

  // This is not a good way to do this but it works for now
  useEffect(() => {
    if (location.pathname !== "/")
      return
    if (!isLoading && !annotator)
      navigate("/user")
    else if (!isLoading && annotator)
      navigate("/projects")
  }, [annotator, isLoading, navigate, location])
  return (<div></div>)
}