import { useEffect, useState } from "react";


export default function useAnnotator() {
  const [annotator, setAnnotator] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setAnnotator(localStorage.getItem("annotator"))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (annotator) {
      localStorage.setItem("annotator", annotator)
    }
  }, [annotator])

  return { annotator, setAnnotator, isLoading }
}