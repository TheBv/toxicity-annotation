import { Button, Col, Container, Form, Row } from "react-bootstrap";
import useAnnotator from "../hooks/useAnnotator";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface AnnotatorForm {
  annotator: string | null
}

export default function AnnotatorPage() {
  const { annotator, setAnnotator, isLoading } = useAnnotator()

  const { register, handleSubmit, setValue } = useForm<AnnotatorForm>({ defaultValues: { annotator: annotator } })

  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading)
      setValue("annotator", annotator)
  }, [annotator, isLoading, setValue])

  const onSubmit = (data: AnnotatorForm) => {
    setAnnotator(data.annotator)
    navigate("/projects")
  }

  return <Container>
    <Row className="justify-content-md-center">
      <Col md={8}>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Form.Group className="mb-3">
            <Form.Label>Please enter your name to continue</Form.Label>
            <Form.Control type="text" placeholder="Name" {...register("annotator")} />
          </Form.Group>
          <Button variant="primary" type="submit">
            OK
          </Button>
        </Form>
      </Col>
    </Row>
  </Container>
}