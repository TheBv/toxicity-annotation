import { useEffect, useState } from 'react';
import axios from 'axios';
import {Container, Row, Col, Alert, Spinner, Table, Form, Button} from 'react-bootstrap';
import { BASE_URL } from '../../constants';

const CancelToken = axios.CancelToken;

export function AnnotateRoute(props) {
    // current annotation task
    const [currentTask, setCurrentTask] = useState(null);
    const [annotation, setAnnotation] = useState(null);
    const [annotationSend, setAnnotationSend] = useState(null);
    const [isSending, setIsSending] = useState(false);

    function updateAnnotation(msg_index, value) {
        setAnnotation({
            ...annotation,
            [msg_index]: value
        })
    }

    // error
    const [error, setError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // trigger getting new task
    // TODO better way to do this?
    const [triggerGetNewTask, setTriggerGetNewTask] = useState(true);

    // get next tweet to annotate
    useEffect(() => {
        if (!props.annotator) {
            return;
        }

        // reset
        setError(false);
        setCurrentTask(null);
        setAnnotation(null);
        setIsLoading(true);
        setAnnotation(null);

        const payload = {
            "annotator": props.annotator,
        }

        console.log("getting next game...", payload)
        const cancelToken = CancelToken.source();
        axios.post(BASE_URL + "/api/v1/toxic_games/next", payload, {
            cancelToken: cancelToken.token
        })
            .then(response => {
                console.log("next game response", response)
                if (response.status === 200) {
                    // success
                    setCurrentTask(response.data);
                    let annotations = Object.fromEntries(response.data["messages"].map((_, index) => {
                        return [[index], "NEUTRAL"]
                    }))
                    setAnnotation(annotations);
                }
            })
            .catch(error => {
                // error
                if (!axios.isCancel(error)) {
                    console.log("next error", error)
                    setError(true);
                }
            })
            .then(() => {
                // always
                setIsLoading(false);
            });

        return () => {
            cancelToken.cancel();
        }

    }, [props.annotator, triggerGetNewTask]);

    useEffect(() => {
        if (!annotation) {
            return;
        }

        const payload = {
            "annotator": props.annotator,
            "annotation": annotation,
            "game_id": currentTask["game_id"],
        }

        setIsSending(true)
        setError(false)

        console.log("sending annotation...", payload)
        axios.post(BASE_URL + "/api/v1/toxic_games/annotate", payload)
            .then(response => {
                console.log("annotate response", response)

                if (response.data.status === true) {
                    // trigger next sentence
                    setTriggerGetNewTask((prev) => !prev)
                }
                else {
                    setError(true)
                }
            })
            .catch(error => {
                console.log("annotate error", error)
                setError(true)
            })
            .then(() => {
                // always
                setIsSending(false)
            });

    }, [props.annotator, annotationSend]);

    return (<div id="annotate_route">
        <Container fluid>

            <Row className="app_content">
                <Col>
                    {
                        error && (<Alert variant="danger">
                            <p>There was an error finding a game to annotate...</p>
                            <p>Please try again later, or contact us if the error persists.</p>
                        </Alert>)
                    }
                    {
                        !error && isSending && (
                            <Alert variant="info" className="mt-4">
                                <Spinner animation="border" role="status" size="sm" />
                                {' '}
                                Saving annotation...
                            </Alert>
                        )
                    }
                    {
                        !error && isLoading && props.annotator && !currentTask && (<Alert variant="info">
                            <Spinner animation="border" role="status" size="sm" />
                            {' '}
                            Finding next game...
                        </Alert>)
                    }
                    {
                        !error && !isLoading && props.annotator && currentTask && currentTask["messages"].length === 0 && (<Alert variant="info">
                            <p>Could not find a game to annotate.</p>
                        </Alert>)
                    }
                    {
                        !error && !isLoading && props.annotator && currentTask && currentTask["messages"].length > 0 && (<div>
                            <p>
                                Please annotate this game chat log:
                            </p>

                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Message</th>
                                        <th>Annotation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {
                                currentTask["messages"].map((message, index) => {
                                    return (
                                        <tr key={"game-msg-"+index}>
                                            <td>#{index+1}</td>
                                            <td>{message["name"]}</td>
                                            <td>{message["msg"]}</td>
                                            <td>
                                                <Form>
                                                    <Button
                                                        id={`radio_msg_ind_${index}`}
                                                        variant={(annotation && annotation[index] === "POSITIVE") ? "success" : "outline-success"}
                                                        onClick={() => updateAnnotation(index, "POSITIVE")}
                                                    >
                                                        Positive
                                                    </Button>
                                                    <Button
                                                        id={`radio_msg_ind_${index}`}
                                                        variant={(annotation && annotation[index] === "NEUTRAL") ? "secondary" : "outline-secondary"}
                                                        onClick={() => updateAnnotation(index, "NEUTRAL")}
                                                    >
                                                        Neutral
                                                    </Button>
                                                    <Button
                                                        id={`radio_msg_ind_${index}`}
                                                        variant={(annotation && annotation[index] === "SLIGHTLY_TOXIC") ? "warning" : "outline-warning"}
                                                        onClick={() => updateAnnotation(index, "SLIGHTLY_TOXIC")}
                                                    >
                                                        Slightly Toxic
                                                    </Button>
                                                    <Button
                                                        id={`radio_msg_ind_${index}`}
                                                        variant={(annotation && annotation[index] === "TOXIC") ? "danger" : "outline-danger"}
                                                        onClick={() => updateAnnotation(index, "TOXIC")}
                                                    >
                                                        Toxic
                                                    </Button>
                                                    <Button
                                                        id={`radio_msg_ind_${index}`}
                                                        variant={(annotation && annotation[index] === "EXTREMELY_TOXIC") ? "dark" : "outline-dark"}
                                                        onClick={() => updateAnnotation(index, "EXTREMELY_TOXIC")}
                                                    >
                                                        Extremely Toxic
                                                    </Button>
                                                </Form>
                                            </td>
                                        </tr>
                                    )
                                })
                                }
                                </tbody>
                            </Table>

                            <Row className={"mb-4"}>
                                <Col>
                                    <Button
                                        disabled={isSending}
                                        variant={"success"}
                                        onClick={() => setAnnotationSend((prev) => !prev)}
                                    >
                                        Send annotation
                                    </Button>
                                </Col>
                            </Row>

                        </div>)
                    }
                </Col>
            </Row>

        </Container>
    </div>)
}