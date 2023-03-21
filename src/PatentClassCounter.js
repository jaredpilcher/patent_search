import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Container, Row, Col, Form, FormGroup, FormControl, Button, Table, Pagination, Modal } from 'react-bootstrap';


const ITEMS_PER_PAGE = 10;
const countClasses = (description) => {
    const classCounts = {};

    const lines = description.split(/\r?\n/);
    lines.forEach((line) => {
        const classPattern = /\s*([A-Z0-9]+)\s*([\d\/]+)(?:\s+|\s{2,})(.*)/;
        const match = classPattern.exec(line);

        if (match) {
            const majorClass = match[1];
            const minorClasses = match[2].split('/');

            if (!classCounts[majorClass]) {
                classCounts[majorClass] = {
                    count: 0,
                    minor: {},
                };
            }

            classCounts[majorClass].count++;

            minorClasses.forEach((minorClass) => {
                if (!classCounts[majorClass].minor[minorClass]) {
                    classCounts[majorClass].minor[minorClass] = 0;
                }

                classCounts[majorClass].minor[minorClass]++;
            });
        }
    });

    return classCounts;
};


const PatentClassCounter = () => {
    const [newPatent, setNewPatent] = useState({ title: '', classDescription: '', url: '' });
    const [filter, setFilter] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [currentPage, setCurrentPage] = useState(1);
    const [classCounts, setClassCounts] = useState(() => {
        const savedClassCounts = localStorage.getItem('classCounts');
        return savedClassCounts ? JSON.parse(savedClassCounts) : {};
    });
    const [patentData, setPatentData] = useState(() => {
        const savedPatents = localStorage.getItem('patentData');
        return savedPatents ? JSON.parse(savedPatents) : [];
    });
    const [completedClasses, setCompletedClasses] = useState(() => {
        const savedCompletedClasses = localStorage.getItem('completedClasses');
        return savedCompletedClasses ? JSON.parse(savedCompletedClasses) : {};
    });
    // New state for the photo modal
    const [photoModal, setPhotoModal] = useState({ show: false, photo: null, title: null });
    const [sortInfo, setSortInfo] = useState({
        major: { field: 'count', direction: 'desc' },
        minor: { field: 'minorCount', direction: 'desc' },
    });

    useEffect(() => {
        const storedData = localStorage.getItem('patentData');
        const storedCompletedClasses = localStorage.getItem('completedClasses');
        if (storedData) {
            setPatentData(JSON.parse(storedData));
        }
        if (storedCompletedClasses) {
            setCompletedClasses(JSON.parse(storedCompletedClasses));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('patentData', JSON.stringify(patentData));
        localStorage.setItem('completedClasses', JSON.stringify(completedClasses));
    }, [patentData, completedClasses]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'photo') {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewPatent((prev) => ({ ...prev, [name]: reader.result }));
            };
            reader.readAsDataURL(file);
        } else {
            setNewPatent((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (newPatent.title && newPatent.classDescription) {
            const patentExists = patentData.some((patent) => patent.title === newPatent.title);

            if (!patentExists) {
                const updatedPatents = [
                    ...patentData,
                    {
                        ...newPatent,
                        id: Date.now(),
                        dateAdded: new Date().toLocaleDateString(), // Add the 'dateAdded' field
                    },
                ];
                setPatentData(updatedPatents);
                localStorage.setItem("patentData", JSON.stringify(updatedPatents));

                const updatedClassCounts = countClasses(newPatent.classDescription);
                setClassCounts((prevClassCounts) => {
                    const mergedClassCounts = mergeClassCounts(prevClassCounts, updatedClassCounts);
                    localStorage.setItem("classCounts", JSON.stringify(mergedClassCounts)); // Save classCounts to local storage
                    return mergedClassCounts;
                });
            }
        }

        setNewPatent({
            title: "",
            classDescription: "",
            url: "",
        });
    };



    const mergeClassCounts = (prevClassCounts, newClassCounts) => {
        const mergedClassCounts = { ...prevClassCounts };

        for (const [majorClass, majorData] of Object.entries(newClassCounts)) {
            if (!mergedClassCounts[majorClass]) {
                mergedClassCounts[majorClass] = { ...majorData };
            } else {
                mergedClassCounts[majorClass].count += majorData.count;

                for (const [minorClass, minorCount] of Object.entries(majorData.minor)) {
                    if (!mergedClassCounts[majorClass].minor[minorClass]) {
                        mergedClassCounts[majorClass].minor[minorClass] = minorCount;
                    } else {
                        mergedClassCounts[majorClass].minor[minorClass] += minorCount;
                    }
                }
            }
        }

        return mergedClassCounts;
    };

    const filteredPatents = patentData.filter((patent) => {
        return patent.title.toLowerCase().includes(filter.toLowerCase());
    });

    const sortedPatents = patentData.sort((a, b) => {
        if (a.title < b.title) {
            return -1;
        }
        if (a.title > b.title) {
            return 1;
        }
        return 0;
    });

    const paginatedPatents = sortedPatents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(patentData.length / ITEMS_PER_PAGE);

    const handleExportCSV = () => {
        const csvContent = `Title,Class Description\n${patentData .map((patent) => `${patent.title},${patent.classDescription.replace(/,/g, ';')}`) .join('\n')}`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, 'patent_data.csv');
    };

    const toggleCompletion = (type, majorClass, minorClass) => {
        setCompletedClasses((prevCompletedClasses) => {
            const updatedCompletedClasses = { ...prevCompletedClasses };

            if (type === 'major') {
                if (updatedCompletedClasses[majorClass] && updatedCompletedClasses[majorClass].major) {
                    updatedCompletedClasses[majorClass] = { ...updatedCompletedClasses[majorClass], major: false };
                } else {
                    if (!updatedCompletedClasses[majorClass]) {
                        updatedCompletedClasses[majorClass] = {};
                    }
                    updatedCompletedClasses[majorClass] = { ...updatedCompletedClasses[majorClass], major: true };
                }
            } else {
                if (!updatedCompletedClasses[majorClass]) {
                    updatedCompletedClasses[majorClass] = {};
                }

                if (updatedCompletedClasses[majorClass][minorClass]) {
                    updatedCompletedClasses[majorClass] = { ...updatedCompletedClasses[majorClass], [minorClass]: false };
                } else {
                    updatedCompletedClasses[majorClass] = { ...updatedCompletedClasses[majorClass], [minorClass]: true };
                }
            }

            return updatedCompletedClasses;
        });
    };

    // Function to open the photo modal
    const handlePhotoClick = (photo, title) => {
        setPhotoModal({ show: true, photo, title });
    };

    // Function to close the photo modal
    const handleCloseModal = () => {
        setPhotoModal({ show: false, photo: null, title: null });
    };

    const onHeaderClick = (tableType, field) => {
        setSortInfo((prevSortInfo) => {
            const prevDirection = prevSortInfo[tableType].field === field ? prevSortInfo[tableType].direction : 'desc';
            const newDirection = prevDirection === 'asc' ? 'desc' : 'asc';
            return { ...prevSortInfo, [tableType]: { field, direction: newDirection } };
        });
    };

    const renderMajorCounts = () => {
        const sortedMajorCounts = Object.entries(classCounts)
            .map(([majorClass, data]) => ({ majorClass, ...data }))
            .sort((a, b) => {
                const sortField = sortInfo.major.field;
                const directionMultiplier = sortInfo.major.direction === 'asc' ? 1 : -1;
                return (a[sortField] - b[sortField]) * directionMultiplier;
            });

        return sortedMajorCounts.map(({ majorClass, count }) => (
            <tr key={majorClass}>

                <td>
                    <a href={generateMajorClassUrl(majorClass)} target="_blank" rel="noopener noreferrer">
                        {majorClass}
                    </a>
                </td>
                <td>{count}</td>
                <td>
                    <Form.Check
                        type="checkbox"
                        checked={!!completedClasses[majorClass] && completedClasses[majorClass].major === true}
                        onChange={() => toggleCompletion('major', majorClass)}
                    />
                </td>
            </tr>
        ));
    };

    const renderMinorCounts = () => {
        const sortedMinorCounts = Object.entries(classCounts)
            .flatMap(([majorClass, { minor }]) =>
                Object.entries(minor).map(([minorClass, minorCount]) => ({
                    majorClass,
                    minorClass,
                    minorCount,
                }))
            )
            .sort((a, b) => {
                const sortField = sortInfo.minor.field;
                const directionMultiplier = sortInfo.minor.direction === 'asc' ? 1 : -1;
                return (a[sortField] - b[sortField]) * directionMultiplier;
            });

        return sortedMinorCounts
            .filter(({minorClass}) => minorClass !== "" || minorClass.trim() !== "")
            .map(({ majorClass, minorClass, minorCount }) => (
            <tr key={`${majorClass}-${minorClass}`}>
                <td>
                    <a href={generateClassUrl(`${majorClass}/${minorClass}`)} target="_blank" rel="noopener noreferrer">
                        {`${majorClass}/${minorClass}`}
                    </a>
                </td>
                <td>{minorCount}</td>
                <td>
                    <Form.Check
                        type="checkbox"
                        checked={!!completedClasses[majorClass] && completedClasses[majorClass][minorClass] === true}
                        onChange={() => toggleCompletion('minor', majorClass, minorClass)}
                    />
                </td>
            </tr>
        ));
    };

    const handleRemovePatent = (patentId) => {
        const patentToRemove = patentData.find((patent) => patent.id === patentId);

        if (patentToRemove) {
            const updatedPatents = patentData.filter((patent) => patent.id !== patentId);
            setPatentData(updatedPatents);
            localStorage.setItem("patentData", JSON.stringify(updatedPatents));

            const updatedClassCounts = countClasses(patentToRemove.classDescription);
            setClassCounts((prevClassCounts) => {
                const reducedClassCounts = subtractClassCounts(prevClassCounts, updatedClassCounts);
                localStorage.setItem("classCounts", JSON.stringify(reducedClassCounts)); // Save classCounts to local storage
                return reducedClassCounts;
            });
        }
    };

    const subtractClassCounts = (prevClassCounts, removedClassCounts) => {
        const reducedClassCounts = { ...prevClassCounts };

        for (const [majorClass, majorData] of Object.entries(removedClassCounts)) {
            if (reducedClassCounts[majorClass]) {
                reducedClassCounts[majorClass].count = Math.max(reducedClassCounts[majorClass].count - majorData.count, 0);

                for (const [minorClass, minorCount] of Object.entries(majorData.minor)) {
                    if (reducedClassCounts[majorClass].minor[minorClass]) {
                        reducedClassCounts[majorClass].minor[minorClass] = Math.max(reducedClassCounts[majorClass].minor[minorClass] - minorCount, 0);

                        if (reducedClassCounts[majorClass].minor[minorClass] === 0) {
                            delete reducedClassCounts[majorClass].minor[minorClass];
                        }
                    }
                }

                if (reducedClassCounts[majorClass].count === 0) {
                    delete reducedClassCounts[majorClass];
                }
            }
        }

        return reducedClassCounts;
    };

    const handleReset = () => {
        setPatentData([]);
        setClassCounts({});
        setCompletedClasses({});

        localStorage.setItem("patentData", JSON.stringify([]));
        localStorage.setItem("classCounts", JSON.stringify({}));
        localStorage.setItem("completedClasses", JSON.stringify({}));
    };

    const handlePhotoUpdate = (patentId, event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const updatedPatents = patentData.map((patent) => {
                if (patent.id === patentId) {
                    return { ...patent, photo: reader.result };
                }
                return patent;
            });
            setPatentData(updatedPatents);
            localStorage.setItem("patentData", JSON.stringify(updatedPatents));
        };
        reader.readAsDataURL(file);
    };

    const generateClassUrl = (className) => {
        const urlEncodedClass = encodeURIComponent(`CPC=(${className})`);
        return `https://patents.google.com/?q=${urlEncodedClass}`;
    };

    const generateMajorClassUrl = (majorClass) => {
        const urlEncodedMajorClass = encodeURIComponent(`(${majorClass})`);
        return `https://patents.google.com/?q=${urlEncodedMajorClass}`;
    };



    return (
        <Container>
            <h2>Add Patent</h2>
            <Row>
                <Col>
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col>
                                <FormGroup>
                                    <FormControl
                                        type="text"
                                        name="title"
                                        placeholder="Title"
                                        value={newPatent.title}
                                        onChange={handleChange}
                                    />
                                </FormGroup>
                            </Col>
                            <Col>
                                <FormGroup>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        name="classDescription"
                                        placeholder="Class Description"
                                        value={newPatent.classDescription}
                                        onChange={handleChange}
                                    />
                                </FormGroup>
                            </Col>
                            <Col>
                                <FormGroup>
                                    <FormControl
                                        type="text"
                                        name="url"
                                        placeholder="Google Patent URL (Optional)"
                                        value={newPatent.url}
                                        onChange={handleChange}
                                    />
                                </FormGroup>
                            </Col>
                            <Col>
                                <FormGroup>
                                    <FormControl
                                        type="file"
                                        name="photo"
                                        accept="image/*"
                                        onChange={handleChange}
                                    />
                                </FormGroup>
                            </Col>
                            <Col>
                                <Button type="submit">Add Patent</Button>
                            </Col>
                        </Row>
                    </Form>
                </Col>
            </Row>
            <h2>Patents</h2>
            <Row>
                <Col>
                    <Table>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Title</th>
                            <th>Date Added</th>
                            <th>Photo</th>
                        </tr>
                        </thead>
                        <tbody>
                        {paginatedPatents.map((patent) => (
                            <tr key={patent.id}>
                                <td style={{ textAlign: 'left' }}>
                                    <a href={patent.url} target="_blank" rel="noopener noreferrer">
                                        {patent.title}
                                    </a>
                                </td>
                                <td>{patent.dateAdded}</td>
                                <td>
                                    {patent.photo ? (
                                        <img
                                            src={patent.photo}
                                            alt={patent.title}
                                            style={{ maxWidth: "100px", maxHeight: "100px", cursor: "pointer" }}
                                            onClick={() => handlePhotoClick(patent.photo, patent.title)}
                                        />
                                    ) : (
                                        <div>
                                            <label htmlFor={`photo-${patent.id}`} className="btn btn-secondary">
                                                Add Photo
                                            </label>
                                            <input
                                                type="file"
                                                id={`photo-${patent.id}`}
                                                name={`photo-${patent.id}`}
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(event) => handlePhotoUpdate(patent.id, event)}
                                            />
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <Button variant="danger" onClick={() => handleRemovePatent(patent.id)}>
                                        Remove
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Pagination>
                        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                        <Pagination.Prev onClick={() => setCurrentPage((prev) => prev - 1)} disabled={currentPage === 1} />
                        <Pagination.Item>{currentPage}</Pagination.Item>
                        <Pagination.Next onClick={() => setCurrentPage((prev) => prev + 1)} disabled={currentPage === totalPages} />
                        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                    </Pagination>
                </Col>
            </Row>
            <h2>Classes</h2>
            <Row>
                <Col>
                    <Table>
                        <thead>
                        <tr>
                            <th>Major Class</th>
                            <th onClick={() => onHeaderClick('major', 'count')} style={{ cursor: 'pointer' }}>Major Count</th>
                            <th>Completed</th>
                        </tr>
                        </thead>
                        <tbody>{renderMajorCounts()}</tbody>
                    </Table>
                </Col>
                <Col>
                    <Table>
                        <thead>
                        <tr>
                            <th>Minor Class</th>
                            <th onClick={() => onHeaderClick('minor', 'count')} style={{ cursor: 'pointer' }}>Minor Count</th>
                            <th>Completed</th>
                        </tr>
                        </thead>
                        <tbody>{renderMinorCounts()}</tbody>
                    </Table>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Button onClick={handleReset}>Reset Tables</Button>
                </Col>
            </Row>

            <Modal show={photoModal.show} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{photoModal.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <img src={photoModal.photo} alt={photoModal.title} style={{ width: '100%', height: 'auto' }} />
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default PatentClassCounter;



