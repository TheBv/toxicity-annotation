import { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Alert, Spinner, Table, Form, Button, Modal, FormCheck } from 'react-bootstrap';
import { BASE_URL } from '../../lib/constants';
import useAnnotator from '../../hooks/useAnnotator';
import { BsSearch } from "react-icons/bs";
import { Controller, useForm } from 'react-hook-form';

const CancelToken = axios.CancelToken;

interface AnnotationTask {
  game_id: string
  annotator: string
  messages: AnnotationMessage[]
  events: AnnotationEvent[]
  players: Record<string, AnnotationPlayer>
}

interface AnnotationMessage {
  msg: string
  name: string
  steamid: string
}

interface AnnotationEvent {
  advantageLost: boolean
  airshot: number
  attacker: string
  backstab: boolean
  capture: boolean
  chargeUsed: boolean
  headshot: boolean
  kill: boolean
  medicDeath: boolean
  medicDrop: boolean
  message: string
  second: number
  victim: string
  weapon: string
}

interface AnnotationPlayer {
  team: string
}

interface Player {
  name: string,
  team: string
}

interface AnnotationForm {
  eventAnnotations: string[],
  problem: boolean,
  gameAnnotation: string
}

export function AnnotateRoute() {
  // current annotation task
  const [currentTask, setCurrentTask] = useState<AnnotationTask | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map<string, Player>())
  const [currentSecond, setCurrentSecond] = useState<number | null>(null)
  const { annotator } = useAnnotator()

  // error
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // trigger getting new task
  // TODO better way to do this?
  const [triggerGetNewTask, setTriggerGetNewTask] = useState(true);

  const { control, register, handleSubmit, setValue } = useForm<AnnotationForm>({
    defaultValues: {
      gameAnnotation: 'NEUTRAL',
      problem: false
    }
  })

  // get next tweet to annotate
  useEffect(() => {
    if (!annotator) {
      return;
    }

    // reset
    setError(false);
    setCurrentTask(null);
    setIsLoading(true);

    const payload = {
      "annotator": annotator,
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
          setValue("eventAnnotations", [...Array(response.data.events.length).keys()].map((v) => 'NEUTRAL'))
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

  }, [annotator, triggerGetNewTask]);

  useEffect(() => {
    const map = new Map<string, Player>()
    if (!currentTask)
      return

    for (const event of currentTask.events) {
      if (event.attacker && !map.has(event.attacker)) {
        map.set(event.attacker, {
          name: `Player ${map.size + 1}`,
          team: findPlayerEntry(currentTask, event.attacker)?.team ?? 'N/A'
        })
      }
      if (event.victim && !map.has(event.victim)) {
        map.set(event.victim, {
          name: `Player ${map.size + 1}`,
          team: findPlayerEntry(currentTask, event.victim)?.team ?? 'N/A'
        })
      }
    }
    setPlayerMap(map)
  }, [currentTask])

  const findPlayerEntry = (task: AnnotationTask, player: string) => {
    return Object.entries(task.players).find(([key, value]) => key === player)?.[1]
  }
  const onSubmit = (data: AnnotationForm) => {
    if (!annotator)
      return
    console.log(data)
    setIsSending(true)
    setError(false)

    const payload = {
      "annotator": annotator,
      "annotation": data.eventAnnotations,
      "problem": data.problem,
      "gameAnnotation": data.gameAnnotation,
      "game_id": currentTask?.game_id,
    }

    fetch(BASE_URL + "/api/v1/toxic_games/annotate", {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    }).then(response => {
      console.log("annotate response", response)
      if (response.status === 200) {
        // trigger next sentence
        setTriggerGetNewTask((prev) => !prev)
      }
      else {
        setError(true)
      }
    }).catch(error => {
      console.log("annotate error", error)
      setError(true)
    }).then(() => {
      // always
      setIsSending(false)
    });
  }

  const getPastEvents = (second: number, pastSeconds: number) => {
    if (!currentTask)
      return
    const events = []
    for (const event of currentTask.events) {
      if (event.second + pastSeconds < second)
        continue
      if (event.second > second)
        break
      events.push(event)
    }
    return events
  }
  console.log(currentTask)
  return (<div id="annotate_route">
    <Container fluid>
      <Modal show={Boolean(currentSecond)} onHide={() => setCurrentSecond(null)} size='lg'>
        <Modal.Header>
          <Modal.Title>Past events</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EventList events={currentSecond ? getPastEvents(currentSecond, 20)! : []} playerMap={playerMap} />
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={() => setCurrentSecond(null)} variant="secondary">Close</Button>
        </Modal.Footer>
      </Modal>
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
            !error && isLoading && annotator && !currentTask && (<Alert variant="info">
              <Spinner animation="border" role="status" size="sm" />
              {' '}
              Finding next game...
            </Alert>)
          }
          {
            !error && !isLoading && annotator && !currentTask && (<Alert variant="info">
              There currently are no more games that you can annotate.
            </Alert>)
          }
          {
            !error && !isLoading && annotator && currentTask && currentTask["events"].length === 0 && (<Alert variant="info">
              <p>Could not find a game to annotate.</p>
            </Alert>)
          }
          {
            !error && !isLoading && annotator && currentTask && currentTask["events"].length > 0 && (
              <div>
                <h3>
                  Please annotate the following messages:
                </h3>
                <Form onSubmit={handleSubmit(onSubmit)}>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                        <th>Name</th>
                        <th>Message</th>
                        <th>Annotation</th>
                        <th>Info</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        currentTask.events.map((event, index) => {
                          if (event.attacker === "Console")
                            return null
                          if (event.message == null)
                            return null
                          const playerData = playerMap.get(event.attacker)
                          return (
                            <tr key={"game-msg-" + index}>
                              <td>#{index + 1}</td>
                              <td style={{ backgroundColor: getTeamColor(playerData?.team) }}>{playerData?.team}</td>
                              <td>{playerData?.name}</td>
                              <td>{event.message}</td>
                              <td>
                                <Controller
                                  control={control}
                                  name={`eventAnnotations.${index}`}
                                  render={({ field: { onChange, value }, fieldState: { error } }) =>
                                    <div>
                                      <Button
                                        id={`radio_msg_ind_${index}`}
                                        variant={value === "NEUTRAL" ? "secondary" : "outline-secondary"}
                                        onClick={() => onChange("NEUTRAL")}
                                      >
                                        Neutral
                                      </Button>
                                      <Button
                                        id={`radio_msg_ind_${index}`}
                                        variant={value === "SLIGHTLY_TOXIC" ? "warning" : "outline-warning"}
                                        onClick={() => onChange("SLIGHTLY_TOXIC")}
                                      >
                                        Slightly Toxic
                                      </Button>
                                      <Button
                                        id={`radio_msg_ind_${index}`}
                                        variant={value === "TOXIC" ? "danger" : "outline-danger"}
                                        onClick={() => onChange("TOXIC")}
                                      >
                                        Toxic
                                      </Button>
                                      <Button
                                        id={`radio_msg_ind_${index}`}
                                        variant={value === "EXTREMELY_TOXIC" ? "dark" : "outline-dark"}
                                        onClick={() => onChange("EXTREMELY_TOXIC")}
                                      >
                                        Extremely Toxic
                                      </Button>
                                      <Button
                                        id={`radio_msg_ind_${index}`}
                                        variant={value === "N/A" ? "info" : "outline-info"}
                                        onClick={() => onChange("N/A")}
                                      >
                                        N/A
                                      </Button>
                                    </div>
                                  }
                                />
                              </td>
                              <td>
                                <BsSearch onClick={() => setCurrentSecond(event.second)} style={{cursor: 'pointer'}}/>
                              </td>
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </Table>
                  <Row style={{ textAlign: 'center' }}>
                    <h3>How would you label the entire game?</h3>
                  </Row>
                  <Controller
                    control={control}
                    name={'gameAnnotation'}
                    render={({ field: { onChange, value }, fieldState: { error } }) =>
                      <Row style={{textAlign: 'center'}}>
                        <Col>
                          <Button
                            variant={value === "NEUTRAL" ? "secondary" : "outline-secondary"}
                            onClick={() => onChange("NEUTRAL")}
                          >
                            Neutral
                          </Button>
                        </Col>
                        <Col>
                          <Button
                            variant={value === "SLIGHTLY_TOXIC" ? "warning" : "outline-warning"}
                            onClick={() => onChange("SLIGHTLY_TOXIC")}
                          >
                            Slightly Toxic
                          </Button>
                        </Col>
                        <Col>
                          <Button
                            variant={value === "TOXIC" ? "danger" : "outline-danger"}
                            onClick={() => onChange("TOXIC")}
                          >
                            Toxic
                          </Button>
                        </Col>
                        <Col>
                          <Button
                            variant={value === "EXTREMELY_TOXIC" ? "dark" : "outline-dark"}
                            onClick={() => onChange("EXTREMELY_TOXIC")}
                          >
                            Extremely Toxic
                          </Button>
                        </Col>
                        <Col>
                          <Button
                            variant={value === "N/A" ? "info" : "outline-info"}
                            onClick={() => onChange("N/A")}
                          >
                            N/A
                          </Button>
                        </Col>
                      </Row>
                    } />
                  <Row className={"mb-4"} style={{ marginTop: '40px' }}>
                    <Col className="d-flex justify-content-center">
                      <Button
                        disabled={isSending}
                        variant={"success"}
                        type='submit'
                       
                      >
                        Send annotation
                      </Button>
                      
                      <FormCheck  style={{marginLeft: '15px', marginTop: '5px'}} label={<h5>I can't annotate this game</h5>} {...register('problem')} />
                    </Col>
                  </Row>
                </Form>
              </div>)
          }
        </Col>
      </Row>

    </Container>
  </div>)
}

export function EventList({ events, playerMap }: { events: AnnotationEvent[], playerMap: Map<string, Player> }) {
  return <div>
    <Table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Player</th>
          <th>Action</th>
          <th>Target</th>
        </tr>
      </thead>
      {events.map((event) => {
        if (event.attacker === 'Console')
          return null
        return <tr>
          <td style={{ width: '7%', textAlign: 'center' }}>
            {Math.floor(event.second / 60)}:{(event.second % 60).toString().length === 1 ? event.second % 60 + '0' : event.second % 60}
          </td>
          <td style={{ backgroundColor: getTeamColor(playerMap.get(event.attacker)?.team) }}>
            {playerMap.get(event.attacker)?.name}
          </td>
          <td>
            {eventToString(event)}
          </td>
          <td style={{ backgroundColor: getTeamColor(playerMap.get(event.victim)?.team) }}>
            {playerMap.get(event.victim)?.name}
          </td>
        </tr>
      })}

    </Table>

  </div>
}

function eventToString(event: AnnotationEvent) {
  if (event.kill)
    return "Kill"
  if (event.message)
    return `Message: ${event.message}`
  if (event.capture)
    return "Captured Point"
  if (event.chargeUsed)
    return "Used charge"
  return null
}

function getTeamColor(team: string | undefined) {
  return team === "Blue" ? 'lightblue' :
    team === "Red" ? 'lightpink' : undefined
}